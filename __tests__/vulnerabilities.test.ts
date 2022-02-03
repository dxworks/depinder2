import {getVulnerabilitiesFromGithub, getVulnerabilitiesFromSonatype} from '../src/commands/vulnerabilities'

describe('test vulnerabilities from Github', () => {
    it('get vulnerabilities for php', async () => {
        const result = await getVulnerabilitiesFromGithub('COMPOSER', 'lcobucci/jwt')

        console.log(JSON.stringify(result))
        expect(result).toBeTruthy()
    })
})

describe('test vulnerabilities from Sonatype', () => {
    it('get vulnerabilities for php', async () => {
        const result = await getVulnerabilitiesFromSonatype(['pkg:composer/laravel/laravel@5.5.0'])

        console.log(JSON.stringify(result))
        expect(result).toBeTruthy()
    })
})
