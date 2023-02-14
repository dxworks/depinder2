import {javascript} from '../plugins/javascript'
import {Plugin} from './plugin'
import {ruby} from '../plugins/ruby'
import {java} from '../plugins/java'
import {python} from '../plugins/python'

export const defaultPlugins: Plugin[] = [
    javascript,
    ruby,
    java,
    python,
    // php,
    // dotnet,
]