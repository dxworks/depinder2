import {Command} from 'commander'
import {_package} from './utils'
import {infoCommand} from './commands/info'

export const mainCommand = new Command()
    .name('depinder')
    .description(_package.description)
    .version(_package.version, '-v, -version, --version, -V')
    .addCommand(infoCommand)

