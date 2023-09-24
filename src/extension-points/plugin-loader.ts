import {javascript} from '../plugins/javascript'
import {Plugin} from './plugin'
import {ruby} from '../plugins/ruby'
import {java} from '../plugins/java'
import {python} from '../plugins/python'
import {dotnet} from '../plugins/dotnet'
import {php} from '../plugins/php'

export const defaultPlugins: Plugin[] = [
    javascript,
    ruby,
    java,
    python,
    php,
    dotnet,
]