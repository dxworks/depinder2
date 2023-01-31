import {createClient} from 'redis'
import {Cache} from './cache'

const client = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',

})
client.on('error', (err) => console.log('Redis Client Error', err))

export const redisCache: Cache = {
    async get(key: string) {
        return await client.json.get(key)
    },
    async set(key: string, value: any) {
        await client.json.set(key, '.', value)
    },
    async has(key: string) {
        return await client.exists(key) !== 0
    },
    async load() {
        await client.connect()
    },
    async write() {
        // await client.disconnect()
        await client.quit()
    },
}