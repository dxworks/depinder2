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

const extractor: Extractor = {
    files: () => ['package.json', 'package-lock.json', 'yarn.lock'],
    lockCommand: () => {
        return ''
    },
}

const parser: Parser = {
    parseDependencyTree: parseLockFile,
}

const parser2: Parser = {
    parseDependencyTree: parseLockFileNonRecursively,
}

function recursivelyTransformDeps(tree: DepTreeDep, result: { [p: string]: DepinderDependency }) {
    const rootId = `${tree.name}@${tree.version}`
    Object.values(tree.dependencies ?? {}).forEach(dep => {
        const id = `${dep.name}@${dep.version}`
        const cachedVersion = result[id]
        if (cachedVersion) {
            cachedVersion.requestedBy = [...cachedVersion.requestedBy, {
                id: rootId,
                requestedVersion: dep.version ?? '',
            }]
        } else {
            result[id] = {
                id,
                version: dep.version,
                name: dep.name,
                semver: new SemVer(dep.version ?? '', true),
                requestedBy: [{id: rootId, requestedVersion: dep.version}],
            } as DepinderDependency
        }
        recursivelyTransformDeps(dep, result)
    })
}

function transformDeps(tree: DepTreeDep) {
    log.info('Starting recursive transformation...')
    const result: { [id: string]: DepinderDependency } = {}
    recursivelyTransformDeps(tree, result)
    log.info('End recursive transformation...')
    return result
}

function transformDepsNoRecurse(tree: DepTreeDep) {
    log.info('Starting non-recursive transformation...')

    const result: { [id: string]: DepinderDependency } = {}

    const rootId = `${tree.name}@${tree.version}`

    let trees: DepTreeDep[] = [tree]

    while (trees.length > 0) {
        trees = trees.flatMap(it => Object.values(it.dependencies ?? {})).map(dep => {
            const id = `${dep.name}@${dep.version}`
            const cachedVersion = result[id]
            if (cachedVersion) {
                cachedVersion.requestedBy = [...cachedVersion.requestedBy, {
                    id: rootId,
                    requestedVersion: dep.version ?? '',
                }]
            } else {
                result[id] = {
                    id,
                    version: dep.version,
                    name: dep.name,
                    semver: new SemVer(dep.version ?? '', true),
                    requestedBy: [{id: rootId, requestedVersion: dep.version}],
                } as DepinderDependency
            }

            return dep
        }).filter(it => it) as DepTreeDep[]

    }
    log.info('End non-recursive transformation...')
    return result
}

async function parseLockFile({root, manifestFile, lockFile}: DependencyFileContext): Promise<DepinderProject> {
    log.info(`parsing ${path.resolve(root, lockFile)}`)
    const result = await buildDepTreeFromFiles(root, manifestFile ?? 'package.json', lockFile, true)

    return {
        path: path.resolve(root, manifestFile ?? 'package.json'),
        name: path.basename(root),
        version: '',
        dependencies: transformDeps(result),
    }
}

async function parseLockFileNonRecursively({root, manifestFile, lockFile}: DependencyFileContext): Promise<DepinderProject> {
    const result = await buildDepTreeFromFiles(root, manifestFile ?? 'package.json', lockFile, true)

    return {
        path: path.resolve(root, manifestFile ?? 'package.json'),
        name: path.basename(root),
        version: '',
        dependencies: transformDepsNoRecurse(result),
    }
}


export const javascript = {
    extractor,
    parser,
    parser2,
}

