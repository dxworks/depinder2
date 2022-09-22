import {retrieveNugetInfo} from '../src/plugins/dotnet'
import {analyseFiles} from '../src/commands/analyse'

describe('test analyse for default plugins', () => {
    it('test analyse for javascript and ruby', async () => {



        await analyseFiles([''])
    })
})
