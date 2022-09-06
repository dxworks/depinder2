import {Command} from 'commander'
import {Extractor} from '../extension-points/extract'
import {plugins} from '../plugins'

export const extractCommand = new Command()
    .name('extract')
    .argument('<folders...>', 'A list of folders to extract dependency information from')
    .action(extract)

async function extract(folders: string[]) {

    const extractors: Extractor[] = plugins.map(it => it.extractor).filter(it => it)

    // const files = extractors.flatMap(plugin => plugin.files ? plugin.files() : [])

}