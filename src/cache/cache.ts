import {LibraryInfo} from '../extension-points/registrar'

export interface Cache {
    get: (key: string) => LibraryInfo | Promise<LibraryInfo> | undefined | any
    set: (key: string, value: LibraryInfo) => void | Promise<void>
    has: (key: string) => boolean | Promise<boolean>
    load: () => void | Promise<void>,
    write: () => void | Promise<void>,
}

export const noCache: Cache = {
    get(key: string): LibraryInfo | undefined {
        return undefined
    },
    set(key: string, value: LibraryInfo): void {

    },
    has(key: string): boolean {
        return false
    },
    load() {
    },
    write() {
    },
}