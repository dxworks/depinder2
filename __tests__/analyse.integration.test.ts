import {analyseFiles} from '../src/commands/analyse'

describe('test analyse for default plugins', () => {
    it('test analyse for javascript and ruby', async () => {

        await analyseFiles(['/Users/mario/test-projects/depinder/javascript'], {results:'test-results'})
    }, 7200000)
})
