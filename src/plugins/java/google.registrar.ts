// import {AbstractRegistrar, LibraryInfo} from '../../extension-points/registrar'
// import parse, {HTMLElement} from 'node-html-parser'
// import moment from 'moment/moment'
//
// export class GoogleMavenRegistrar extends AbstractRegistrar {
//     // private browser: Browser | undefined
//
//     async retrieveFromRegistry(libraryName: string): Promise<LibraryInfo> {
//         const [groupId, artifactId] = libraryName.split(':')
//         const root = await this.getParsedHtmlForLibrary(groupId, artifactId)
//
//         const versionHTMLElements = root.querySelectorAll('div.artifact-child-item')
//         const versions = await Promise.all(versionHTMLElements.map(async (it: HTMLElement) => {
//             const version = it.querySelector('span')?.text ?? ''
//             const versionDetails = await this.getParsedHtmlForLibrary(groupId, artifactId, version)
//
//             const allKeys = versionDetails.querySelectorAll('td.gav-pom-key')
//             if (allKeys.length === 0) {
//                 console.log('no keys')
//             }
//             const licensesElement = allKeys.find((it: HTMLElement) => it.text == 'License(s)')?.parentNode?.querySelector('td.gav-pom-value')
//             const licenses = licensesElement?.querySelectorAll('a')?.map((it: HTMLElement) => it.text.trim()) ?? []
//             const lastModifiedDate = allKeys.find((it: HTMLElement) => it.text == 'Last Updated Date')?.parentNode?.querySelector('td.gav-pom-value>span')?.text
//             const timestamp = moment(lastModifiedDate, 'MM/DD/YYYY').valueOf()
//             const description = allKeys.find((it: HTMLElement) => it.text == 'Description')?.parentNode?.querySelector('td.gav-pom-value>span')?.text
//
//             return {
//                 version,
//                 timestamp,
//                 latest: versionHTMLElements[0].querySelector('span')?.text === version,
//                 licenses,
//                 description,
//             }
//         }))
//
//         // await this.browser.close()
//         return {
//             name: libraryName,
//             versions,
//             description: versions[0]?.description ?? '',
//             licenses: [...new Set(versions.map(it => it.licenses).flat())],
//             reposUrl: [],
//             issuesUrl: [],
//         }
//     }
//
//     private async getParsedHtmlForLibrary(groupId: string, artifactId: string, version = ''): Promise<HTMLElement> {
//         const mavenSearchURL = `https://maven.google.com/web/index.html#${groupId}:${artifactId}:${version}`
//         const browser = await puppeteer.launch({headless: true})
//         const page = await browser.newPage()
//         await page.goto(mavenSearchURL, {waitUntil: ['domcontentloaded', 'networkidle2']})
//         const mavenData = await page.content()
//         await page.close()
//         await browser.close()
//         return parse(mavenData)
//     }
// }