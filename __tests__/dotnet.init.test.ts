import {retrieveNugetInfo} from '../src/plugins/dotnet'
import {analyseFiles} from '../src/commands/analyse'

describe('default test', () => {
    it('should pass', async () => {
        const res = await retrieveNugetInfo('Unity')

        console.log(res)
    })

    it('analyse dotnet files', async () => {

        await analyseFiles(['/Users/mario/test-projects/depinder/depminer/constructed/dotnet'], {results: 'results'})
        console.log('done')
    })
})
