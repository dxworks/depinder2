import {
    DependencyFileContext,
    DepinderDependency,
    DepinderProject,
    Extractor,
    Parser,
} from '../../extension-points/extract'
// @ts-ignore
import * as gemfile from '@snyk/gemfile'
import path from 'path'
import semver from 'semver/preload'

const extractor: Extractor = {
    files: () => ['Gemfile', '*.gemspec', 'Gemfile.lock'],
    lockCommand: () => {
        return ''
    },
}

const parser: Parser = {
    parseDependencyTree: parseLockFile,
}

function transformDeps(tree: any) {

    const result: { [id: string]: DepinderDependency } = {}

    const directDeps = new Set(Object.keys(tree.dependencies))

    Object.keys(tree.specs).forEach(specName => {
        const value = tree.specs[specName]
        const id = `${specName}@${value.version}`
        result[specName] = {
            id,
            name: specName,
            version: value.version,
            semver: semver.coerce(value.version),
            type: value.type,
            requestedBy: [],
        } as DepinderDependency
    })

    Object.keys(tree.specs).forEach(specName => {
        const value = tree.specs[specName]
        const id = `${specName}@${value.version}`
        Object.keys(value).filter(it => !['version', 'remote', 'type'].includes(it)).forEach(spec => {
            const cachedValue = result[spec] as DepinderDependency
            if (cachedValue) {
                cachedValue.requestedBy = [...cachedValue.requestedBy, {id, requestedVersion: value[spec].version}]
            }
        })
    })

    // TODO: read Gemfile and add the requestedBy field for the direct dependencies
    // directDeps.forEach(dep => {
    //     const cachedValue = result[dep] as DepinderDependency
    //     if(cachedValue) {
    //         cachedValue.requestedBy = [...cachedValue.requestedBy, {id: tree, requestedVersion: tree.]
    //     }
    // })

    return result
}

function parseLockFile({root, lockFile}: DependencyFileContext): DepinderProject {
    const result = gemfile.parseSync(path.resolve(root, lockFile), true)

    return {
        name: path.basename(root),
        path: root,
        version: '',
        dependencies: transformDeps(result),
    }
}

export const ruby = {
    extractor,
    parser,
}

