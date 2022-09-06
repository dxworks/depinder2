import {Extractor, Parser} from './extract'
import {Registrar} from './registrar'
import {VulnerabilityChecker} from './vulnerability-checker'

export interface Plugin {
    name: string // the name of the technology (could be language name or package manager name)
    extractor: Extractor // defines which files to search for
    parser?: Parser // defines how to parse the files specified by the extractor and returns a tree with all dependencies
    registrar: Registrar // gets information about libraries from package manager apis
    checker?: VulnerabilityChecker // checks for vulnerabilities for the found dependencies
}