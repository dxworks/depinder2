// import {Command} from 'commander'
// import {ComposerPackage, parseComposerFile, parseComposerLockFile} from '../info/php/parser'
// import path from 'path'
// import * as fs from 'fs'
// import {getPackageDetails} from '../plugins/php/info'
// import _ from 'lodash'
// import moment from 'moment'
// import spdxCorrect from 'spdx-correct'
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const licenseIds = require('spdx-license-ids/')
//
//
// export const infoCommand = new Command()
//     .name('info')
//     .argument('[composerFiles...]', 'A list of composer.json or composer.lock files, or folder to search for such files')
//     .action(getInfoForFiles)
//
// // async function getComposerPackages(file: string): Promise<{ file: string, packages: ComposerPackage[] }> {
// //     let packages: ComposerPackage[] = []
// //     if (path.basename(file) === 'composer.json')
// //         packages = await getAllDependenciesFromComposerJson(parseComposerFile(file))
// //     else if (path.basename(file) === 'composer.lock')
// //         packages = await getAllDependenciesFromLock(parseComposerLockFile(file))
// //
// //     // console.log(packages)
// //     return {file: file, packages: packages}
// // }
//
// function phpFileFilter(children: string[]) {
//     const composerLock = children.find(f => path.basename(f) === 'composer.lock')
//     if (composerLock)
//         return [composerLock]
//     const composerFile = children.find(f => path.basename(f) === 'composer.json')
//     if (composerFile)
//         return [composerFile]
//     return []
// }
//
// // async function getComposerPackages(it: { file: string; packages: string[] }, cacheMap: Map<string, Promise<ComposerPackage | null>>): Promise<ComposerPackage[]> {
// //     return (await Promise.all(it.packages.map(async p => {
// //         let packageInfo = cacheMap.get(p)
// //         if (packageInfo === undefined) {
// //             packageInfo = getPackageDetails(p)
// //             cacheMap.set(p, packageInfo)
// //             return await packageInfo
// //         }
// //         return await packageInfo
// //     }))).filter(it => it !== null) as ComposerPackage[]
// // }
//
// function getPurl(composerPackage: ComposerPackage) {
//     return `pkg:composer/${composerPackage.name.replace('@', '%40')}@${composerPackage.version}`
// }
//
// export async function getDeps(composerFiles: string[]): Promise<{ file: string, packages: ComposerPackage[] }[]> {
//     const allFiles: string[] = composerFiles
//         .flatMap(file => {
//             if (fs.statSync(path.resolve(file)).isDirectory()) {
//                 return walkTopDownSync(file, phpFileFilter)
//             } else if (path.basename(file) === 'composer.json' || path.basename(file) === 'composer.lock')
//                 return [file]
//             return []
//         })
//
//     const packagesAndFiles: { file: string, packages: string[] }[] = allFiles.map(f => {
//         if (f.endsWith('composer.lock'))
//             return {file: f, packages: parseComposerLockFile(f).packages.map(it => it.name)}
//         if (f.endsWith('composer.json'))
//             return {
//                 file: f,
//                 packages: [...Object.keys(parseComposerFile(f).require || {}), ...Object.keys(parseComposerFile(f)['require-dev'] || {})],
//             }
//         return {file: f, packages: []}
//     }).filter(it => it.packages.length)
//
//     const packageNameToInfo = new Map<string, ComposerPackage>()
//
//     const uniqPackages = _.uniq(packagesAndFiles.flatMap(it => it.packages))
//     const promises = await Promise.all(uniqPackages.map(p => getPackageDetails(p)))
//     promises.forEach(it => {
//         if (it) {
//             packageNameToInfo.set(it.name, it)
//         }
//     })
//     const foundPackages = [...packageNameToInfo.values()]
//
//     const allLicenses = _.groupBy(foundPackages, p => {
//         const license: string | undefined = Object.values(p.versions).flatMap(it => it.license).find(() => true)
//         if (!license)
//             return 'unknown'
//         if (!licenseIds.includes(license))
//             return spdxCorrect(license || 'unknown') || 'unknown'
//         return license
//     })
//     fs.writeFileSync(path.resolve(process.cwd(), 'results', 'licenses.csv'), Object.keys(allLicenses).map(l => {
//         return `${l},${allLicenses[l].length},${allLicenses[l].map(it => it.name)}`
//     }).join('\n'))
//
//     // for (const p of foundPackages) {
//     //     const githubResponse = await getVulnerabilitiesFromGithub('COMPOSER', p.name)
//     //     const vulnerabilities = githubResponse.securityVulnerabilities.nodes.filter((it: any) => {
//     //         try {
//     //             const semver = new SemVer(p.version || '', true)
//     //             const range = new Range(it.vulnerableVersionRange)
//     //             return range.test(semver)
//     //         } catch (e: any) {
//     //             return false
//     //         }
//     //     })
//     //     p.vulnerabilities = vulnerabilities || []
//     //     p.allVulnerabilities = githubResponse.securityVulnerabilities.nodes
//     // }
//     // const sonatypeVulnerabilities = await Promise.all(_.chunk(foundPackages, 128).map(chunk => {
//     //     getVulnerabilitiesFromSonatype(chunk.map(it => getPurl(it)))
//     // }))
//
//
//     // return (await Promise.all(it.packages.map(async p => {
//     //     let packageInfo = cacheMap.get(p)
//     //     if (packageInfo === undefined) {
//     //         packageInfo = getPackageDetails(p)
//     //         cacheMap.set(p, packageInfo)
//     //         return await packageInfo
//     //     }
//     //     return await packageInfo
//     // }))).filter(it => it !== null) as ComposerPackage[]
//
//
//     // return await Promise.all(packagesAndFiles.map(async it => {
//     //     return {
//     //         file: it.file,
//     //         packages: await getComposerPackages(it, packageNameToInfo),
//     //     }
//     // }))
//
//     return packagesAndFiles.map(it => {
//         return {
//             file: it.file,
//             packages: it.packages.map(p => packageNameToInfo.get(p) as ComposerPackage).filter(it => it !== undefined),
//         }
//     })
//
// }
//
// export async function getInfoForFiles(composerFiles: string[]) {
//     const deps: { file: string, packages: ComposerPackage[] }[] = await getDeps(composerFiles)
//
//
//     fs.writeFileSync(path.resolve(process.cwd(), 'results', 'depsInfo.json'), JSON.stringify(deps))
//
// }
//
// type Transformer<T, R> = (x: T) => R
//
// function walkTopDownSync(folder: string, filter: Transformer<string[], string[]>): string[] {
//     const fileNames: string[] = []
//     const allFiles = fs.readdirSync(folder)
//
//     const children = allFiles.map(it => path.resolve(folder, it))
//     fileNames.push(...filter(children))
//
//     fileNames.push(...allFiles.filter(it => fs.statSync(path.resolve(folder, it)).isDirectory()).flatMap(it => walkTopDownSync(path.resolve(folder, it), filter)))
//
//     return fileNames
// }
//
// export function computeDTOForExport(pack: ComposerPackage): string {
//     const dateFormat = 'MMM YYYY'
//     const latestVersion = Object.values(pack.versions).sort((v1, v2) => {
//         const v1mom = moment(v1.time)
//         const v2mom = moment(v2.time)
//         if (v1mom.isBefore(v2mom)) return 1
//         if (v1mom.isAfter(v2mom)) return -1
//         return 0
//     })[0]
//     const latestVersionMoment = moment(latestVersion.time)
//
//     const thisVersionMoment = moment(pack.time)
//     const nowMoment = moment()
//
//     const vulns = pack.vulnerabilities || []
//
//     const severities = vulns.map(v => v.severity).join('\n')
//
//     const links = vulns.map(v => v.advisory.permalink).join('\n')
//
//     return `${pack.name},${pack.version},${latestVersion.version},${thisVersionMoment.format(dateFormat)},${latestVersionMoment.format(dateFormat)},${nowMoment.diff(thisVersionMoment, 'months', false)},${latestVersionMoment.diff(thisVersionMoment, 'months', false)},${nowMoment.diff(latestVersionMoment, 'months', false)},${vulns.length},"${severities}","${links}"`
// }