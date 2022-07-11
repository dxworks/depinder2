import axios from 'axios'
import {IPackagistPackageVersionDetails} from '../../info/php/info'


export async function getPackageDetails(
    packageName: string
): Promise< IPackagistPackageVersionDetails[] | null> {
    console.log(`Getting info for ${packageName}`)

    try {
        const response = await axios.get(`https://api.nuget.org/v3/registration3/${packageName.toLowerCase()}/index.json`)
        return parseData(response.data)
    } catch (e: any) {
        console.warn(`Packagist could not find package ${packageName.toLowerCase()}`)
        console.error(e.message, e.stack)
        return null
    }

}

function parseData (
    responseData: any
): IPackagistPackageVersionDetails[] {
    const packageVersionDetailsList: IPackagistPackageVersionDetails[] = []
    responseData.items.forEach((item : any) => {
        item.items.forEach( (i: any) => {
            const packageVersionDetails: IPackagistPackageVersionDetails = {
                ...i,
            }
            packageVersionDetailsList.push(packageVersionDetails)
        })
    })
    return packageVersionDetailsList
}
