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
import {Cache, noCache} from '../cache/cache'
import {getRedisDockerContainerStatus} from './redis'
import {jsonCache} from '../cache/json-cache'
import {redisCache} from '../cache/redis-cache'
import {Vulnerability} from '../extension-points/vulnerability-checker'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const licenseIds = require('spdx-license-ids/')

export const analyseCommand = new Command()
    .name('analyse')
    .argument('[folders...]', 'A list of folders to walk for files')
    .option('--results, -r', 'The results folder', 'results')
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
    const directDep: boolean = !dep.requestedBy || Object.keys(dep.requestedBy).some(it => it.startsWith(`${proj.name}@${proj.version}`))
    return `${proj.path},${proj.name},${dep.name},${dep.version},${latestVersion?.version},${currentVersionMoment?.format(dateFormat)},${latestVersionMoment?.format(dateFormat)},${latestVersionMoment?.diff(currentVersionMoment, 'months')},${now?.diff(currentVersionMoment, 'months')},${now?.diff(latestVersionMoment, 'months')},${dep.vulnerabilities?.length},"${vulnerabilities}",${directDep},${dep.type},"${dep.libraryInfo?.licenses}"`
}

async function extractProjects(plugin: Plugin, files: string[]) {
    return (await Promise.all(plugin.extractor.createContexts(files).flatMap(async context => {
        log.info(`Parsing dependency tree information for ${JSON.stringify(context)}`)
        try {
            if (!plugin.parser) {
                log.info(`Plugin ${plugin.name} does not have a parser!`)
                return null
            }
            const proj: DepinderProject = await plugin.parser.parseDependencyTree(context)
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

function chooseCacheOption(): Cache {
    if (getRedisDockerContainerStatus() != 'running') {
        log.warn('Redis is not running, using in-memory cache')
        return jsonCache
    }
    return redisCache
}

export async function analyseFiles(folders: string[], options: { results: string }, useCache = true): Promise<void> {
    const resultFolder = options.results
    if (!fs.existsSync(path.resolve(process.cwd(), resultFolder))) {
        fs.mkdirSync(path.resolve(process.cwd(), resultFolder), {recursive: true})
        log.info('Creating results dir')
    }
    const allFiles = folders.flatMap(it => walkDir(it))

    for (const plugin of plugins) {
        log.info(`Plugin ${plugin.name} starting`)

        const cache: Cache = useCache ? chooseCacheOption() : noCache
        cache.load()

        const files = allFiles.filter(it => !plugin.extractor.filter ? (it) : true).filter(it => plugin.extractor.files.some(pattern => it.match(pattern)))

        const projects: DepinderProject[] = await extractProjects(plugin, files)

        for (const project of projects) {
            log.info(`Plugin ${plugin.name} analyzing project ${project.name}@${project.version}`)
            for (const dep of Object.values(project.dependencies)) {
                try {
                    let lib
                    if (await cache.has(`${plugin.name}:${dep.name}`)) {
                        lib = await cache.get(`${plugin.name}:${dep.name}`) as LibraryInfo
                    } else {
                        log.info(`Getting remote information on ${dep.name}`)

                        lib = await plugin.registrar.retrieve(dep.name)
                        if (plugin.checker?.githubSecurityAdvisoryEcosystem) {
                            log.info(`Getting vulnerabilities for ${lib.name}`)
                            lib.vulnerabilities = await getVulnerabilitiesFromGithub(plugin.checker.githubSecurityAdvisoryEcosystem, lib.name)
                        }
                        await cache.set(`${plugin.name}:${dep.name}`, lib)
                    }
                    dep.libraryInfo = lib
                    const thisVersionVulnerabilities = lib.vulnerabilities?.filter((it: Vulnerability) => {
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

        await cache.write()

        const allLibsInfo = projects.flatMap(proj => Object.values(proj.dependencies).map(dep => dep.libraryInfo))

        const allLicenses = _.groupBy(allLibsInfo, (lib: LibraryInfo) => {
            const license: string | undefined = lib.versions.flatMap(it => it.licenses).find(() => true)
            if (!license || typeof license !== 'string')
                return 'unknown'
            if (!licenseIds.includes(license))
                return spdxCorrect(license || 'unknown') || 'unknown'
            return license
        })

        fs.writeFileSync(path.resolve(process.cwd(), resultFolder, `${plugin.name}-licenses.csv`), Object.keys(allLicenses).map(l => {
            return `${l},${allLicenses[l].length},${allLicenses[l].map((it: any) => it.name)}`
        }).join('\n'))

        const header = 'Project Path,Project,Library,Used Version,Latest Version,Used Version Release Date,Latest Version Release Date,Latest-Used,Now-Used,Now-latest,Vulnerabilities,Vulnerability Details,DirectDependency,Type,Licenses\n'
        fs.writeFileSync(path.resolve(process.cwd(), resultFolder, `${plugin.name}-libs.csv`), header + projects.flatMap(proj =>
            Object.values(proj.dependencies).map(dep => convertDepToRow(proj, dep))).join('\n'))


        const projectStatsHeader = 'Project Path,Project,Direct Deps,Indirect Deps,Direct Outdated Deps, Direct Outdated %,Indirect Outdated Deps, Indirect Outdated %, Direct Vulnerable Deps, Indirect Vulnerable Deps, Direct Out of Support, Indirect Out of Support\n'
        fs.writeFileSync(path.resolve(process.cwd(), resultFolder, `${plugin.name}-project-stats.csv`), projectStatsHeader + projects.map(proj => {
            const enhancedDeps: DependencyInfo[] = Object.values(proj.dependencies).map(dep => {
                const latestVersion = dep.libraryInfo?.versions.find(it => it.latest)
                const currentVersion = dep.libraryInfo?.versions.find(it => it.version == dep.version)
                const latestVersionMoment = moment(latestVersion?.timestamp)
                const currentVersionMoment = moment(currentVersion?.timestamp)
                const now = moment()
                const directDep: boolean = !dep.requestedBy || Object.keys(dep.requestedBy).some(it => it.startsWith(`${proj.name}@${proj.version}`))

                return {
                    ...dep,
                    direct: directDep,
                    latest_used: latestVersionMoment.diff(currentVersionMoment, 'months'),
                    now_used: now.diff(currentVersionMoment, 'months'),
                    now_latest: now.diff(latestVersionMoment, 'months'),
                } as DependencyInfo
            })
            const directDeps = enhancedDeps.filter(dep => dep.direct)
            const indirectDeps = enhancedDeps.filter(dep => !dep.direct)

            const outdatedThreshold = 15

            const directOutdated = directDeps.filter(dep => dep.latest_used > outdatedThreshold)
            const directOutDatedPercent = directOutdated.length / directDeps.length * 100
            const indirectOutdated = indirectDeps.filter(dep => dep.latest_used > outdatedThreshold)
            const indirectOutDatedPercent = indirectOutdated.length / indirectDeps.length * 100
            const directVulnerable = directDeps.filter(dep => dep.vulnerabilities && dep.vulnerabilities.length > 0)
            const indirectVulnerable = indirectDeps.filter(dep => dep.vulnerabilities && dep.vulnerabilities.length > 0)

            const outOfSupportThreshold = 24
            const directOutOfSupport = directDeps.filter(dep => dep.now_latest > outOfSupportThreshold)
            const indirectOutOfSupport = indirectDeps.filter(dep => dep.now_latest > outOfSupportThreshold)

            return `${proj.path},${proj.name},${directDeps.length},${indirectDeps.length},${directOutdated.length},${directOutDatedPercent},${indirectOutdated.length},${indirectOutDatedPercent},${directVulnerable.length},${indirectVulnerable.length},${directOutOfSupport.length},${indirectOutOfSupport.length}`
        }).join('\n'))
    }

    log.info('Done')
}

interface DependencyInfo extends DepinderDependency {
    direct: boolean
    latest_used: number
    now_used: number
    now_latest: number
}

