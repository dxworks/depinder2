import {retrieveNugetInfo} from '../src/plugins/dotnet'

describe('default test', () => {
    it('should pass', async () => {
        const res = await retrieveNugetInfo('Unity')

        console.log(res)
    })
})
