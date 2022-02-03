import {graphql} from '@octokit/graphql'
import axios from 'axios'

export async function getVulnerabilitiesFromGithub(ecosystem: string, packageName: string): Promise<any> {
    console.log(`Getting vulnerabilities from Github for ${packageName}`)
    const authGraphql = graphql.defaults({
        headers: {
            authorization: `token ${process.env.GH_TOKEN}`,
        },
    })

    return await authGraphql(
        `
            query securityVulnerabilities($ecosystem: SecurityAdvisoryEcosystem, $package: String!){
              securityVulnerabilities(first: 100, ecosystem: $ecosystem package: $package) {
                pageInfo {
                  endCursor
                  hasNextPage
                }
                nodes {
                  firstPatchedVersion {
                    identifier
                  }
                  package {
                    name
                    ecosystem
                  }
                  severity
                  updatedAt
                  vulnerableVersionRange
                  advisory {
                    identifiers {
                      value
                      type
                    }
                    databaseId
                    description
                    ghsaId
                    id
                    origin
                    permalink
                    publishedAt
                    references {
                      url
                    }
                    severity
                    summary
                    updatedAt
                    withdrawnAt
                  }
                }
              }
            }
        `.trim(),
        {
            ecosystem: ecosystem,
            package: packageName,
        }
    )
}

export async function getVulnerabilitiesFromSonatype(purls: string[]): Promise<any> {
    const {data} = await axios.post('https://ossindex.sonatype.org/api/v3/component-report', {coordinates: purls})

    return data
}