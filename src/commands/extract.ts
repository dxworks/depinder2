import {Command} from 'commander'
import {_package} from '../utils'
import {Extractor} from '../extension-points/extract'
import {plugins} from '../index'

export const extractCommand = new Command()
    .name('extract')
    .description(_package.description)
    .argument('<folders...>', 'A list of folders to extract dependency information from')
    .action(extract)

async function extract(folders: string[]) {

    const extractors: Extractor[] = plugins.map(it => it.extractor).filter(it => it)

    const files = extractors.flatMap(plugin => plugin.files ? plugin.files() : [])

}