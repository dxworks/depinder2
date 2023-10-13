import {DepinderDependency, DepinderProject} from './extract'

export interface CodeFinder {
    findFiles(project: DepinderProject, allFiles: string[]): Promise<string[]> // filters the files that are related to this project

    extractUsages?(project: DepinderProject): Promise<LibraryUsage[]> // extracts the usages of the dependencies in the project from the files

    languages: string[] // the languages that this code finder supports

    getDeclaredEntities?(library: DepinderDependency): Promise<string[]> // returns the list of entities that are declared in the library (e.g. classes, functions, packages, namespaces etc.)

    checkUsage(library: DepinderDependency, importedEntity: string): Promise<boolean> // checks if the library is used in the file
}

export interface LibraryUsage {
    file: string,
    importedEntity: string,
    used: boolean,
    language: string,
}