import {
    DependencyFileContext,
    DepinderDependency,
    DepinderProject,
    Extractor,
    Parser,
} from '../../extension-points/extract'
import {buildDepTreeFromFiles} from 'snyk-nodejs-lockfile-parser'
import path from 'path'
import {SemVer} from 'semver'
import {DepTreeDep} from 'snyk-nodejs-lockfile-parser/dist/parsers'
import {log} from '@dxworks/cli-common'
import {LibraryInfo, Registrar} from '../../extension-points/registrar'
import {json} from 'npm-registry-fetch'
import {VulnerabilityChecker} from '../../extension-points/vulnerability-checker'
import {Plugin} from '../../extension-points/plugin'

const extractor: Extractor = {
    files: ['package.json', 'package-lock.json', 'yarn.lock'],
    createContexts: files => {
        const packageLocks = files.filter(it => it.endsWith('package-lock.json')).map(it => ({
            root: path.dirname(it),
            lockFile: path.basename(it),
            manifestFile: 'package.json',
        } as DependencyFileContext))

        const yarnLocks = files.filter(it => it.endsWith('yarn.lock')).map(it => ({
            root: path.dirname(it),
            lockFile: path.basename(it),
            manifestFile: 'package.json',
        } as DependencyFileContext))

        return [...packageLocks, ...yarnLocks]
    },
    filter: it => !it.includes('node_modules'),
}

const parser: Parser = {
    parseDependencyTree: parseLockFile,
}

function recursivelyTransformDeps(tree: DepTreeDep, result: Map<string, DepinderDependency>) {
    const rootId = `${tree.name}@${tree.version}`
    Object.values(tree.dependencies ?? {}).forEach(dep => {
        const id = `${dep.name}@${dep.version}`
        const cachedVersion = result.get(id)
        if (cachedVersion) {
            cachedVersion.requestedBy[rootId] = dep.version ?? ''
        } else {
            try {
                const semver = new SemVer(dep.version ?? '', true)
                result.set(id, {
                    id,
                    version: dep.version,
                    name: dep.name,
                    semver: semver,
                    requestedBy: {[rootId]: dep.version},
                } as DepinderDependency)
            } catch (e) {
                log.warn(`Invalid version! ${e}`)
            }
        }
        recursivelyTransformDeps(dep, result)
    })
}

function transformDeps(tree: DepTreeDep, root: string): Map<string, DepinderDependency> {
    log.info(`Starting recursive transformation for ${root}`)
    const result: Map<string, DepinderDependency> = new Map<string, DepinderDependency>()
    recursivelyTransformDeps(tree, result)
    log.info(`End recursive transformation for ${root}.`)
    return result
}
async function parseLockFile({root, manifestFile, lockFile}: DependencyFileContext): Promise<DepinderProject> {
    log.info(`parsing ${path.resolve(root, lockFile)}`)
    const result = await buildDepTreeFromFiles(root, manifestFile ?? 'package.json', lockFile, true)

    return {
        path: path.resolve(root, manifestFile ?? 'package.json'),
        name: path.basename(root),
        version: '',
        dependencies: Object.fromEntries(transformDeps(result, root)),
    }
}

export async function retrieveFromNpm(libraryName: string): Promise<LibraryInfo> {
    const response: any = await json(libraryName)

    return {
        name: response.name,
        versions: Object.values(response.versions).map((it: any) => {
            return {
                version: it.version,
                timestamp: Date.parse(response.time[it.version]),
                licenses: it.license,
                latest: it.version == response['dist-tags']?.latest,
            }
        }),
        description: response.description,
        issuesUrl: [],
        licenses: [response.license],
        reposUrl: [],
        keywords: response.keywords,
    }
}

const registrar: Registrar = {
    retrieve: retrieveFromNpm,
}

const checker: VulnerabilityChecker = {
    githubSecurityAdvisoryEcosystem: 'NPM',
    getPURL: (lib, ver) => `pkg:npm/${lib.replace('@', '%40')}@${ver}`,
}

export const javascript: Plugin = {
    name: 'javascript',
    extractor,
    parser,
    registrar,
    checker,
}

