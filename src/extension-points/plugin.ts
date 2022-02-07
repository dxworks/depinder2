import {Extractor, Parser} from './extract'
import {Registrar} from './registrar'
import {VulnerabilityChecker} from './vulnerability-checker'

export interface Plugin {
    extractor: Extractor,
    parser: Parser,
    registrar: Registrar,
    checker?: VulnerabilityChecker,
}