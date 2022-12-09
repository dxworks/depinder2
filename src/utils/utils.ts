import path from 'path'
import {homedir} from 'os'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const _package = require('../../package.json')


export function getAssetFile(assetName: string): string {
    return path.join(__dirname, '..', 'assets', assetName)
}

export const npmExePath = getBin('npm')

function getBin(exe: string): string {
    return path.resolve(__dirname, '..', '..', 'node_modules', '.bin', exe)
}


export const depinderFolder = path.join(homedir(), '.dxw', 'depinder')

export function getHomeDir(): string {
    if (!fs.existsSync(depinderFolder)) {
        fs.mkdirSync(depinderFolder)
    }
    return depinderFolder
}