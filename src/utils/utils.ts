import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const _package = require('../../package.json')


export function getAssetFile(assetName: string): string {
    return path.join(__dirname, 'assets', assetName)
}

export const npmExePath = getBin('npm')

function getBin(exe: string): string {
    return path.resolve(__dirname, '..', '..', 'node_modules', '.bin', exe)
}