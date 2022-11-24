import axios from 'axios'
import {Plugin} from '../../extension-points/plugin'
import {LibraryInfo, Registrar} from '../../extension-points/registrar'
import {DependencyFileContext, DepinderProject, Extractor, Parser} from '../../extension-points/extract'
import {VulnerabilityChecker} from '../../extension-points/vulnerability-checker'
import moment from 'moment'

import tmp from 'tmp'

import {runNugetInspectorProgrammatically} from '@dxworks/nuget-inspector'
import fs from 'fs'


export async function retrieveNugetInfo(
    packageName: string
): Promise<LibraryInfo> {
    console.log(`Getting info for ${packageName}`)
    const response = await axios.get(`https://api.nuget.org/v3/registration5-gz-semver2/${packageName.toLowerCase()}/index.json`)
    return parseData(response.data)
}

function parseData(
    responseData: any
): LibraryInfo {
    const versions: any[] = responseData?.items?.flatMap((it: any) => it.items) || []

    versions.sort((a, b) => moment(b.catalogEntry.published).valueOf() - moment(a.catalogEntry.published).valueOf())

    const latestVersion = versions[0].catalogEntry.version
    // if(versions) {
    return {
        name: versions[0].catalogEntry.id,
        versions: versions?.map(it => {
            return {
                version: it.catalogEntry.version,
                licenses: `${it.catalogEntry?.licenseExpression || ''} ${it.catalogEntry?.licenseUrl}`.trim(),
                timestamp: moment(it.catalogEntry.published).valueOf(),
                latest: it.catalogEntry.version === latestVersion,
            }
        }),
        licenses: [...new Set(versions.map(it => `${it.catalogEntry?.licenseExpression || ''} ${it.catalogEntry?.licenseUrl}`.trim()))],
        requiresLicenseAcceptance: versions.some(it => it.catalogEntry.requireLicenseAcceptance),
    }

}

export const registrar: Registrar = {
    retrieve: retrieveNugetInfo,
}

const extractor: Extractor = {
    files: [],
    createContexts: () => [],
}

async function runNugetInspector(context: DependencyFileContext): Promise<DepinderProject> {

    const tempFile = tmp.fileSync()
    // await runNugetInspectorProgrammatically(context.root, tempFile.name, process.cwd())
    console.log(JSON.parse(fs.readFileSync(tempFile.name).toString()))

    return {
        version: '',
        dependencies: {},
        name: '',
        path: '',
    }
}


const parser: Parser = {
    parseDependencyTree: runNugetInspector,
}

const checker: VulnerabilityChecker = {
    githubSecurityAdvisoryEcosystem: 'NUGET',
    getPURL: (lib, ver) => `pkg:nuget/${lib.replace('@', '%40')}@${ver}`,
}

export const dotnet: Plugin = {
    name: 'dotnet',
    extractor,
    // parser,
    registrar,
    checker,
}
