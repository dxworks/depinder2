import {DepinderProject} from '../../../extension-points/extract'
import {getPackageSemver} from '../../../utils/utils'


export function parseMavenDependencyTree(input: string): DepinderProject {
    const lines = input.split('\n')
    const rootLine = lines[0].split(':')
    const root: DepinderProject = {
        name: `${rootLine[0]}:${rootLine[1]}`,
        version: rootLine[3],
        path: '',
        dependencies: {},
    }

    const stack: {id: string, level: number}[] = []

    for (let i = 1; i < lines.length; i++) {
        // Determine the level by counting leading plus signs, each representing one level of depth.
        const level = getIndentLevel(lines[i])

        // Remove leading special characters from the line and split into parts.
        const parts = lines[i].replaceAll('|', '').replaceAll('+-', '').replaceAll('\\-', '').trim().split(':')

        const name = `${parts[0]}:${parts[1]}`
        const version = parts[3]
        const id = `${name}@${version}`
        const type = parts[4]?.split(' ')[0]
        const optional = lines[i].includes('(optional)')
        const semver = getPackageSemver(version)

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop()
        }

        root.dependencies[id] = {
            id,
            name,
            version,
            semver,
            type: optional ? undefined : type,
            requestedBy: stack.length > 0 ? [stack[stack.length - 1].id] : [`${root.name}@${root.version}`],
        }

        stack.push({ id, level })
    }

    return root
}

function getIndentLevel(line: string): number {
    let indentLevel = 0
    while (line.startsWith('|  ') || line.startsWith('   ')) {
        line = line.substring(3)
        indentLevel++
    }
    return indentLevel
}
