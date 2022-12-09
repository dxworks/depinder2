import {Command} from 'commander'
import {_package} from './utils/utils'
import {infoCommand} from './commands/info'
import {analyseCommand} from './commands/analyse'
import {redisCommand} from './commands/redis'

export const mainCommand = new Command()
    .name('depinder')
    .description(_package.description)
    .version(_package.version, '-v, -version, --version, -V')
    .addCommand(infoCommand)
    .addCommand(analyseCommand)
    .addCommand(redisCommand)

