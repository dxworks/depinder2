import {Command} from 'commander'
import {execSync} from 'child_process'
import {log} from '@dxworks/cli-common'
import chalk from 'chalk'
import fs from 'fs'
import {getAssetFile, getHomeDir} from '../utils/utils'
import path from 'path'


export async function redisUpAction(): Promise<void> {
    execSync('docker-compose up -d', {cwd: path.resolve(getHomeDir(), 'redis'), stdio: 'inherit'})
}

export async function redisDownAction(): Promise<void> {
    execSync('docker-compose down', {cwd: path.resolve(getHomeDir(), 'redis'), stdio: 'inherit'})
}

export function getRedisDockerContainerStatus(): string | null {
    try {
        const output = execSync('docker inspect depinder-redis-stack').toString()
        const result: any[] = JSON.parse(output)
        if (result.length == 0) {
            log.error('Redis is not running')
            return null
        }
        return result[0].State.Status
    } catch (e) {
        return null
    }

}

export function redisInfoAction(): void {
    const status = getRedisDockerContainerStatus()
    if (status == null) {
        log.error('Redis is not running')
        log.info(`To start redis run: ${chalk.yellow('depinder redis up')}`)
        return
    }
    if (status == 'running') {
        log.info(chalk.green('Redis is running'))
    } else {
        log.info(`Redis is ${status}`)
        log.info(`To start redis run: ${chalk.yellow('depinder redis up')}`)
    }
}

export function redisInitAction(): void {
    if (!fs.existsSync(path.join(getHomeDir(), 'redis', 'docker-compose.yml'))) {
        fs.mkdirSync(path.join(getHomeDir(), 'redis'), {recursive: true})
        fs.copyFileSync(getAssetFile('redis.docker-compose.yml'), path.join(getHomeDir(), 'redis', 'docker-compose.yml'))
    }
}

export const redisUpCommand = new Command()
    .name('up')
    .alias('start')
    .action(redisUpAction)

export const redisDownCommand = new Command()
    .name('down')
    .alias('stop')
    .action(redisDownAction)

export const redisInfoCommand = new Command()
    .name('info')
    .alias('i')
    .action(redisInfoAction)

export const redisInitCommand = new Command()
    .name('init')
    .argument('[url]', 'Redis URL', 'redis://localhost:6379')
    .action(redisInitAction)

export const redisCommand = new Command()
    .name('redis')
    .action(redisInfoAction)
    .addCommand(redisUpCommand)
    .addCommand(redisDownCommand)
    .addCommand(redisInfoCommand)
    .addCommand(redisInitCommand)


