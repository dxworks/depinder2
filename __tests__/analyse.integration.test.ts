import {analyseFiles} from '../src/commands/analyse'

describe('test analyse for default plugins', () => {
    it('test analyse for javascript and ruby', async () => {

        // await analyseFiles(['/Users/mario/Endava/clients/Ferrari/dependencies/constructed'], {results: 'results-ferrari'})
        await analyseFiles(['/Users/mario/projects/dxworks/depinder'], {results: 'results-depinder'})
    }, 7200000)
})
