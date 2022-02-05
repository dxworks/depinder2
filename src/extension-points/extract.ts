import {SemVer} from 'semver'

export interface Extractor {
    files?: FileDefinition
    lockCommand?: LockCommand
}

export interface Parser {
    parseDependencyTree: ParseDependencyTree
}

export type FileDefinition = () => string[]
export type LockCommand = (context: Context) => string
export type ParseDependencyTree = (context: DependencyFileContext) => DepinderProject | Promise<DepinderProject>

export interface Context {
    cwd: string
}

export interface DependencyFileContext {
    root: string
    manifestFile?: string
    lockFile: string
}

export interface DepinderProject {
    name: string,
    version: string,
    path: string,
    dependencies: {
        [dependencyId: string]: DepinderDependency
    }
}

export interface DepinderDependency {
    id: string // name@exact_version
    name: string
    version: string
    semver: SemVer
    type?: string
    requestedBy: { id: string, requestedVersion: string }[] // if requested by root project the list will be falsy
}
