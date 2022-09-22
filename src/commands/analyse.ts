import {Command} from 'commander'
import fs from 'fs'
import path from 'path'
import {plugins} from '../plugins'
import {DepinderDependency, DepinderProject} from '../extension-points/extract'
import {log} from '@dxworks/cli-common'
import {LibraryInfo} from '../extension-points/registrar'
import {getVulnerabilitiesFromGithub} from '../utils/vulnerabilities'
import {Range} from 'semver'
import _ from 'lodash'
import spdxCorrect from 'spdx-correct'
import moment from 'moment'
import {Plugin} from '../extension-points/plugin'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const licenseIds = require('spdx-license-ids/')

export const analyseCommand = new Command()
    .name('analyse')
    .argument('[folders...]', 'A list of folders to walk for files')
    .option('[folders...]', 'A list of folders to walk for files')
    .action(analyseFiles)

export function walkDir(dir: string): string[] {
    const allChildren = fs.readdirSync(dir)
    const files = allChildren.map(it => path.resolve(dir, it)).filter(it => fs.lstatSync(it).isFile())
    return [...files, ...allChildren.map(it => path.resolve(dir, it)).filter(it => fs.lstatSync(it).isDirectory()).flatMap(it => walkDir(path.resolve(dir, it)))]
}

function convertDepToRow(proj: DepinderProject, dep: DepinderDependency): string {
    const latestVersion = dep.libraryInfo?.versions.find(it => it.latest)
    const currentVersion = dep.libraryInfo?.versions.find(it => it.version == dep.version)
    const latestVersionMoment = moment(latestVersion?.timestamp)
    const currentVersionMoment = moment(currentVersion?.timestamp)
    const now = moment()

    const dateFormat = 'MMM YYYY'
    const vulnerabilities = dep.vulnerabilities?.map(v => `${v.severity} - ${v.permalink}`).join('\n')
    const directDep: boolean = !dep.requestedBy || Object.keys(dep.requestedBy).some(it => it.startsWith(proj.name))
    return `${proj.name},${dep.name},${dep.version},${latestVersion?.version},${currentVersionMoment?.format(dateFormat)},${latestVersionMoment?.format(dateFormat)},${latestVersionMoment?.diff(currentVersionMoment, 'months')},${now?.diff(currentVersionMoment, 'months')},${now?.diff(latestVersionMoment, 'months')},${dep.vulnerabilities?.length},"${vulnerabilities}",${directDep},${dep.type},"${dep.libraryInfo?.licenses}"`
}

async function extractProjects(plugin: Plugin, files: string[]) {
    return (await Promise.all(plugin.extractor.createContexts(files).flatMap(async context => {
        log.info(`Parsing dependency tree information for ${JSON.stringify(context)}`)
        try {
            if(!plugin.parser){
                log.info(`Plugin ${plugin.name} does not have a parser!`)
                return null
            }
            const proj: DepinderProject = await plugin.parser.parseDependencyTree(context)
            // fs.writeFileSync(path.resolve(process.cwd(), 'results-js', 'cache', `${plugin.name}-${proj.name}@${proj.version}.json`), JSON.stringify(proj))
            log.info(`Done parsing dependency tree information for ${JSON.stringify(context)}`)
            return proj
        } catch (e: any) {
            log.warn(`Exception parsing dependency tree information for ${JSON.stringify(context)}`)
            log.error(e)
        }
        return null
    })))
        .filter(it => it != null)
        .map(it => it as DepinderProject)
}

export async function analyseFiles(folders: string[]): Promise<void> {
    const allFiles = folders.flatMap(it => walkDir(it))

    const allLibs: Map<string, Map<string, LibraryInfo>> = new Map<string, Map<string, LibraryInfo>>() // a map with all plugins as keys and a map of all libs as values
    for (const plugin of plugins) {
        log.info(`Plugin ${plugin.name} starting`)
        const pluginLibMap = new Map<string, LibraryInfo>()
        allLibs.set(plugin.name, pluginLibMap)

        const files = allFiles.filter(it => !plugin.extractor.filter?(it) : true).filter(it => plugin.extractor.files.some(pattern => it.match(pattern)))

        const projects: DepinderProject[] = await extractProjects(plugin, files)

        for (const project of projects) {
            log.info(`Plugin ${plugin.name} analyzing project ${project.name}@${project.version}`)
            for (const dep of Object.values(project.dependencies)) {
                try {
                    let lib
                    if (pluginLibMap.has(dep.name)) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        lib = pluginLibMap.get(dep.name)!
                    } else {
                        log.info(`Getting remote information on ${dep.name}`)

                        lib = await plugin.registrar.retrieve(dep.name)
                        if (plugin.checker?.githubSecurityAdvisoryEcosystem) {
                            log.info(`Getting vulnerabilities for ${lib.name}`)
                            lib.vulnerabilities = await getVulnerabilitiesFromGithub(plugin.checker.githubSecurityAdvisoryEcosystem, lib.name)
                        }
                        pluginLibMap.set(dep.name, lib)
                    }
                    dep.libraryInfo = lib
                    const thisVersionVulnerabilities = lib.vulnerabilities?.filter(it => {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            const range = new Range(it.vulnerableRange?.replaceAll(',', ' ') ?? '')
                            return range.test(dep.version)
                        } catch (e: any) {
                            log.warn(`Vulnerable range unknown: ${it.vulnerableRange}`)
                            return false
                        }
                    })
                    dep.vulnerabilities = thisVersionVulnerabilities || []
                } catch (e: any) {
                    log.warn(`Exception getting remote info for ${dep.name}`)
                }
            }
        }


        fs.writeFileSync(path.resolve(process.cwd(), 'results-js', 'cache', `${plugin.name}-libs.json`), JSON.stringify(Object.fromEntries(pluginLibMap)))

        const allLicenses = _.groupBy([...pluginLibMap.values()], (lib: LibraryInfo) => {
            const license: string | undefined = lib.versions.flatMap(it => it.licenses).find(() => true)
            if (!license || typeof license !== 'string')
                return 'unknown'
            if (!licenseIds.includes(license))
                return spdxCorrect(license || 'unknown') || 'unknown'
            return license
        })

        fs.writeFileSync(path.resolve(process.cwd(), 'results', `${plugin.name}-licenses.csv`), Object.keys(allLicenses).map(l => {
            return `${l},${allLicenses[l].length},${allLicenses[l].map((it: any) => it.name)}`
        }).join('\n'))

        const header = 'Project,Library,Used Version,Latest Version,Used Version Release Date,Latest Version Release Date,Latest-Used,Now-Used,Now-latest,Vulnerabilities,Vulnerability Details,DirectDependency,Type,Licenses\n'
        fs.writeFileSync(path.resolve(process.cwd(), 'results', `${plugin.name}-libs.csv`), header + projects.flatMap(proj =>
            Object.values(proj.dependencies).map(dep => convertDepToRow(proj, dep))).join('\n'))
    }

    log.info('Done')
}

