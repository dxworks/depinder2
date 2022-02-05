#!/usr/bin/env node

import {mainCommand} from './depinder'
import {Plugin} from './extension-points/plugin'
import {defaultPlugins} from './extension-points/plugin-loader'
import fs from 'fs'

function loadDynamicPlugins(pluginsFile: string): Plugin[] {
    const pluginsJson = JSON.parse(fs.readFileSync(pluginsFile).toString()) as {path: string, field?: string}[]

    return pluginsJson.map(it => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const imported = require(it.path)
        if(it.field)
            return imported[it.field]
        return imported
    })
}

function loadPlugins() {
    return [...defaultPlugins, ...loadDynamicPlugins('plugins.json')] // refactor to how dxworks cli does this when loading plugins
}

export const plugins: Plugin[] = loadPlugins()

mainCommand
    .parse(process.argv)
