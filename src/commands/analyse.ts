import {Command} from 'commander'
import {_package} from '../utils'

function analyseFiles() {

}

export const analyseCommand = new Command()
    .name('analyse')
    .description(_package.description)
    .argument('[composerFiles...]', 'A list of composer.json or composer.lock files, or folder to search for such files')
    .action(analyseFiles)

