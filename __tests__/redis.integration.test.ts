import {redisDownAction, redisInfoAction, redisInitAction, redisUpAction} from '../src/commands/redis'

describe('test redis commands', () => {
    it('test redis info', async () => {
        redisInfoAction()
    })
    // it('test redis init', async () => {
    //     redisInitAction()
    // })
    // it('test redis up', async () => {
    //     await redisUpAction()
    // })
    // it('test redis down', async () => {
    //     await redisDownAction()
    // })
})