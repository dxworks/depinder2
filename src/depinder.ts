import {Command} from 'commander'
import {_package} from './utils'

export const mainCommand = new Command()
  .name('depinder')
  .description(_package.description)
  .version(_package.version, '-v, -version, --version, -V')

