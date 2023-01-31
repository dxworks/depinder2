// import {
//     DependencyFileContext,
//     DepinderDependency,
//     DepinderProject,
//     Extractor,
//     Parser,
// } from '../../extension-points/extract'
// import path from 'path'
// import {log} from '@dxworks/cli-common'
// import {DepTreeDep} from 'snyk-nodejs-lockfile-parser/dist/parsers'
// import {SemVer} from 'semver'
// import fs from 'fs'
// import {LibraryInfo, Registrar} from '../../extension-points/registrar'
// import {json} from 'npm-registry-fetch'
// import {VulnerabilityChecker} from '../../extension-points/vulnerability-checker'
// import {Plugin} from '../../extension-points/plugin'
// import {Composer, ComposerLock} from '../../info/php/parser'
// import {getPackageDetails, IPackagistPackageDetails} from './info'
//
// const extractor: Extractor = {
//     files: ['composer.json', 'composer.lock'],
//     createContexts: files => {
//         const lockFileContexts = files.filter(it => it.endsWith('composer.lock')).map(it => ({
//             root: path.dirname(it),
//             lockFile: path.basename(it),
//             manifestFile: 'composer.json',
//         } as DependencyFileContext))
//
//         return lockFileContexts
//     },
//     filter: it => !it.includes('/vendor'),
// }
//
// export function parseComposerFile(file: string): Composer {
//     return JSON.parse(fs.readFileSync(file).toString()) as Composer
// }
//
// export function parseComposerLockFile(file: string): ComposerLock {
//     return JSON.parse(fs.readFileSync(file).toString()) as ComposerLock
// }
//
// const parser: Parser = {
//     parseDependencyTree: parseLockFile,
// }
//
// function recursivelyTransformDeps(tree: DepTreeDep, result: Map<string, DepinderDependency>) {
//     const rootId = `${tree.name}@${tree.version}`
//     Object.values(tree.dependencies ?? {}).forEach(dep => {
//         const id = `${dep.name}@${dep.version}`
//         const cachedVersion = result.get(id)
//         if (cachedVersion) {
//             cachedVersion.requestedBy[rootId] = dep.version ?? ''
//         } else {
//             try {
//                 const semver = new SemVer(dep.version ?? '', true)
//                 result.set(id, {
//                     id,
//                     version: dep.version,
//                     name: dep.name,
//                     semver: semver,
//                     requestedBy: {[rootId]: dep.version},
//                 } as DepinderDependency)
//             } catch (e) {
//                 log.warn(`Invalid version! ${e}`)
//             }
//         }
//         recursivelyTransformDeps(dep, result)
//     })
// }
//
// function transformDeps(tree: DepTreeDep, root: string): Map<string, DepinderDependency> {
//     log.info(`Starting recursive transformation for ${root}`)
//     const result: Map<string, DepinderDependency> = new Map<string, DepinderDependency>()
//     recursivelyTransformDeps(tree, result)
//     log.info(`End recursive transformation for ${root}.`)
//     return result
// }
//
// async function parseLockFile({root, manifestFile, lockFile}: DependencyFileContext): Promise<DepinderProject> {
//     if(!manifestFile) {
//         throw new Error('No manifest file found!')
//     }
//     const composer = parseComposerFile(path.join(root, manifestFile))
//     composer.require
//
//     if (lockFile) {
//         const composerLock = parseComposerLockFile(path.join(root, lockFile))
//         composerLock.packages.forEach(it => {
//
//         })
//         const dependencies = transformDeps(tree, root)
//
//     }
//     return {
//         name: composer.name,
//         version: composer.version || '',
//         path: root,
//         dependencies: Object.fromEntries(dependencies),
//     }
// }
//
// export async function retrieveFromComposer(libraryName: string): Promise<LibraryInfo> {
//     const response: IPackagistPackageDetails = await getPackageDetails(libraryName)
//
//     return {
//         name: response.name,
//         versions: Object.values(response.versions).map((it: any) => {
//             return {
//                 version: it.version,
//                 timestamp: Date.parse(response.time[it.version]),
//                 licenses: it.license,
//                 latest: it.version == response['dist-tags']?.latest,
//             }
//         }),
//         description: response.description,
//         issuesUrl: [],
//         licenses: [response.license],
//         reposUrl: [],
//         keywords: response.keywords,
//     }
// }
//
// const registrar: Registrar = {
//     retrieve: retrieveFromComposer,
// }
//
// const checker: VulnerabilityChecker = {
//     githubSecurityAdvisoryEcosystem: 'COMPOSER',
//     getPURL: (lib, ver) => `pkg:composer/${lib.replace('@', '%40')}@${ver}`,
// }
//
// export const php: Plugin = {
//     name: 'php',
//     extractor,
//     parser,
//     registrar,
//     checker,
// }