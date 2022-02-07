
export interface Registrar {
    retrieve?: RegistryRetriever
}

export type RegistryRetriever = (libraryName: string) => LibraryInfo | Promise<LibraryInfo>

interface LibraryVersion {
    version: string
    timestamp: number
    license?: string
    latest: boolean
}
export interface LibraryInfo {
    name: string
    description?: string
    versions: LibraryVersion[]
    reposUrl?: string[]
    issuesUrl?: string[]
    licenses: string[]
    keywords: string[]
}
