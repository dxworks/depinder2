import * as fs from 'fs'
import {getPackageDetails, IPackagistPackageVersionDetails} from '../../plugins/php/php-interfaces'

export interface ComposerSupport {
    email?: string
    issues?: string
    forum?: string
    wiki?: string
    irc?: string
    source?: string
    docs?: string
    rss?: string
    chat?: string
}

export interface Composer {
    name: string
    type: string
    version?: string
    description?: string
    repository?: string
    keywords?: string[]
    require?: { [key: string]: string }
    'require-dev'?: { [key: string]: string }
    conflict?: { [key: string]: string }
    replace?: { [key: string]: string }
    provide?: { [key: string]: string }
    suggest?: { [key: string]: string }
    homepage?: string
    readme?: string
    license?: string
    support?: ComposerSupport
    time?: string
}

export interface ComposerLock {
    packages: ComposerPackage[]
    'packages-dev': ComposerPackage[]
    _readme: string
    'minimum-stability': string
}

export interface ComposerPackageLocation {
    type: string
    url: string
    reference: string
}

export interface ComposerPackage extends Composer {
    source?: ComposerPackageLocation
    dist?: ComposerPackageLocation
    versions: {
        [version: string]: IPackagistPackageVersionDetails;
    }
    github_stars?: number
    github_watchers?: number
    github_forks?: number
    github_open_issues?: number
    language?: string
    dependents: number
    suggesters: number
    downloads: {
        total: number
        monthly: number
        daily: number
    };
    favers: number,

    vulnerabilities?: any[],
    allVulnerabilities?: any[],
}


export function parseComposerFile(file: string): Composer {
    return JSON.parse(fs.readFileSync(file).toString()) as Composer
}

export function parseComposerLockFile(file: string): ComposerLock {
    return JSON.parse(fs.readFileSync(file).toString()) as ComposerLock
}

async function addVersions(it: ComposerPackage): Promise<ComposerPackage | null> {
    const response = await getPackageDetails(it.name)
    if(!response)
        return null
    it.versions = response.versions
    it.github_watchers = response.github_watchers
    it.github_stars = response.github_starts
    it.github_forks = response.github_forks
    it.github_open_issues = response.github_open_issues
    it.language = response.language
    it.dependents = response.dependents
    it.suggesters = response.suggesters
    it.downloads = response.downloads
    it.favers = response.favers
    return it
}

export async function getAllDependenciesFromLock(deps: ComposerPackage[]): Promise<ComposerPackage[]> {
    return (await Promise.all(deps.map(it => addVersions(it)))).filter(it => it != null).map(it => it as ComposerPackage)
}


export async function getAllDependenciesFromComposerJson(deps: string[]): Promise<ComposerPackage[]> {
    return (await Promise.all(deps.map(it => getPackageDetails(it)))).filter(it => it !== null).map(it => it as ComposerPackage)
}