import {javascript} from '../plugins/javascript'
import {Plugin} from './plugin'
import {ruby} from '../plugins/ruby'
import {dotnet} from '../plugins/dotnet'

export const defaultPlugins: Plugin[] = [
    javascript,
    ruby,
    dotnet,
]