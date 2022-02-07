import {Extractor} from './extract'
import {Registrar} from './registrar'

export interface Plugin {
    extractor: Extractor,
    registrar: Registrar,
}