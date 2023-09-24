import {updateLibs} from '../src/commands/update'

describe('test update for default plugins', () => {
    it('test update all plugins', async () => {

        await updateLibs('2023-09-23',['gem'])

        console.log('done')
    }, 7200000)
})
