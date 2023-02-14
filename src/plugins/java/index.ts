import {DependencyFileContext, DepinderProject, Extractor, Parser} from '../../extension-points/extract'
// @ts-ignore
import path from 'path'
import {AbstractRegistrar, LibrariesIORegistrar, LibraryInfo} from '../../extension-points/registrar'
import fetch from 'node-fetch'
import {VulnerabilityChecker} from '../../extension-points/vulnerability-checker'
import {Plugin} from '../../extension-points/plugin'
import fs from 'fs'
import {depinderTempFolder} from '../../utils/utils'
import moment from 'moment'
import {log} from '@dxworks/cli-common'
import parse, {HTMLElement} from 'node-html-parser'
import puppeteer from 'puppeteer/lib/cjs/puppeteer/puppeteer'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pomParser = require('pom-parser')

const extractor: Extractor = {
    files: ['pom.json', 'build.gradle', 'build.gradle.kts'],
    createContexts: files => {

        const pomContexts = files.filter(it => it.endsWith('pom.json')).map(it => ({
            root: path.dirname(it),
            lockFile: path.basename(it),
            type: 'maven-with-dep-tree',
        } as DependencyFileContext))

        const gradleContexts = files.filter(it => it.endsWith('build.gradle') || it.endsWith('build.gradle.kts')).map(it => ({
            root: path.dirname(it),
            manifestFile: path.basename(it),
            lockFile: 'gradle.json',
            type: 'gradle',
        }) as DependencyFileContext)

        return [...pomContexts, ...gradleContexts]
    },
}

const parser: Parser = {
    parseDependencyTree: parseLockFile,
}

function parseLockFile(context: DependencyFileContext): DepinderProject {
    if (context.type === 'maven-with-dep-tree') {
        return JSON.parse(fs.readFileSync(path.resolve(context.root, context.lockFile)).toString()) as DepinderProject
    }

    if (context.type === 'gradle') {
        if (fs.existsSync(path.resolve(context.root, context.lockFile))) {
            const proj = JSON.parse(fs.readFileSync(path.resolve(context.root, context.lockFile)).toString()) as DepinderProject
            return {
                ...proj,
                dependencies: Object.entries(proj.dependencies).filter(([, value]) =>
                    value.requestedBy.includes(`${proj.name}@${proj.version}`),
                ).reduce((acc, [key, value]) => ({...acc, [key]: value}), {}),
            }
        }
    }

    throw new Error(`Unsupported context type: ${context.type}`)
}

async function parsePomFile(pomFile: string): Promise<string> {
    return new Promise((resolve, reject) => {
        pomParser.parse({filePath: pomFile}, (err: any, pom: any) => {
            if (err) {
                reject(err)
            }
            resolve(pom)
        })
    })
}

async function getLatestAvailablePom(groupId: string, artifactId: string, docs: any[]): Promise<any> {
    for (let i = 0; i < docs.length; i++) {
        const pomUrl = `https://search.maven.org/remotecontent?filepath=${groupId.replace(/\./g, '/')}/${artifactId}/${docs[i].v}/${artifactId}-${docs[i].v}.pom`
        const pomResponse: any = await fetch(pomUrl)
        if (pomResponse.status === 200)
            return pomResponse
    }
}

const checker: VulnerabilityChecker = {
    githubSecurityAdvisoryEcosystem: 'MAVEN',
    getPURL: (lib, ver) => `pkg:maven/${lib.replace(':', '/')}@${ver}`,
}

export class MavenCentralRegistrar extends AbstractRegistrar {
    async retrieveFromRegistry(libraryName: string): Promise<LibraryInfo> {
        const [groupId, artifactId] = libraryName.split(':')

        const abortController = new AbortController()
        setTimeout(() => abortController.abort(), 5000)

        const mavenSearchURL = `https://search.maven.org/solrsearch/select?q=g:"${groupId}" AND a:"${artifactId}"&core=gav&wt=json`
        const mavenResponse: any = await fetch(mavenSearchURL, {signal: abortController.signal})
        const mavenData = await mavenResponse.json()
        const docs = mavenData.response.docs

        let pom: any
        try {
            await this.getPom(groupId, artifactId, docs, libraryName)
        } catch (e) {
            log.warn(`Failed to get pom for ${libraryName}`)
            throw e
        }
        return {
            name: libraryName,
            versions: docs.map((it: any) => {
                return {
                    version: it.v,
                    timestamp: it.timestamp,
                    latest: it.v === docs[0].v,
                    licenses: [],
                }
            }),
            description: pom?.project.description ?? '',
            licenses: pom?.project.licenses ? [pom?.project.licenses.map((it: any) => it.name)] : [],
            reposUrl: pom?.project.scm ? [pom?.project.scm.connection] : [],
            issuesUrl: pom?.project?.issueManagement?.url ? [pom?.project.issueManagement.url] : [],
        }
    }

    async getPom(groupId: string, artifactId: string, docs: string[], libraryName: string): Promise<any> {
        const pomResponse = await getLatestAvailablePom(groupId, artifactId, docs)
        const pomData = await pomResponse.text()

        const pomFile = path.resolve(depinderTempFolder, `${libraryName}.pom`)
        fs.writeFileSync(pomFile, pomData)

        const pom: any = await parsePomFile(pomFile)
        fs.rmSync(pomFile)
        return pom
    }
}

export class GoogleMavenRegistrar extends AbstractRegistrar {
    // private browser: Browser | undefined

    async retrieveFromRegistry(libraryName: string): Promise<LibraryInfo> {
        const [groupId, artifactId] = libraryName.split(':')
        // this.browser = await puppeteer.launch({headless: true})
        const root = await this.getParsedHtmlForLibrary(groupId, artifactId)

        const versionHTMLElements = root.querySelectorAll('div.artifact-child-item')
        const versions = await Promise.all(versionHTMLElements.map(async (it: HTMLElement) => {
            const version = it.querySelector('span')?.text ?? ''
            const versionDetails = await this.getParsedHtmlForLibrary(groupId, artifactId, version)

            const allKeys = versionDetails.querySelectorAll('td.gav-pom-key')
            if (allKeys.length === 0) {
                console.log('no keys')
            }
            const licensesElement = allKeys.find((it: HTMLElement) => it.text == 'License(s)')?.parentNode?.querySelector('td.gav-pom-value')
            const licenses = licensesElement?.querySelectorAll('a')?.map((it: HTMLElement) => it.text.trim()) ?? []
            const lastModifiedDate = allKeys.find((it: HTMLElement) => it.text == 'Last Updated Date')?.parentNode?.querySelector('td.gav-pom-value>span')?.text
            const timestamp = moment(lastModifiedDate, 'MM/DD/YYYY').valueOf()
            const description = allKeys.find((it: HTMLElement) => it.text == 'Description')?.parentNode?.querySelector('td.gav-pom-value>span')?.text

            return {
                version,
                timestamp,
                latest: versionHTMLElements[0].querySelector('span')?.text === version,
                licenses,
                description,
            }
        }))

        // await this.browser.close()
        return {
            name: libraryName,
            versions,
            description: versions[0]?.description ?? '',
            licenses: [...new Set(versions.map(it => it.licenses).flat())],
            reposUrl: [],
            issuesUrl: [],
        }
    }

    private async getParsedHtmlForLibrary(groupId: string, artifactId: string, version = ''): Promise<HTMLElement> {
        const mavenSearchURL = `https://maven.google.com/web/index.html#${groupId}:${artifactId}:${version}`
        const browser = await puppeteer.launch({headless: true})
        const page = await browser.newPage()
        await page.goto(mavenSearchURL, {waitUntil: ['domcontentloaded', 'networkidle2']})
        const mavenData = await page.content()
        await page.close()
        await browser.close()
        return parse(mavenData)
    }
}

const javaRegistrar = new MavenCentralRegistrar(new GoogleMavenRegistrar(new LibrariesIORegistrar('maven')))

export const java: Plugin = {
    name: 'java',
    extractor,
    parser,
    registrar: javaRegistrar,
    checker,
}

