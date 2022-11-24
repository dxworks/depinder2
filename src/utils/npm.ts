import {execSync} from 'child_process'
import {npmExePath} from './utils'

export const npm = {
    install,
    npmCommand,
}

function install(module = '', otherOptions = '', directory: string): any {
    npmCommand(`install ${module} ${otherOptions}`, {cwd: directory, stdio: 'inherit'})
}

function npmCommand(args: string, options?: any): string | Buffer {
    if (!options)
        return execSync(`${npmExePath} ${args}`, {cwd: options.cwd, stdio: ['pipe', 'pipe', 'inherit']})
    else
        return execSync(`${npmExePath} ${args}`, options)
}