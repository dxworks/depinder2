import {getPackageDetails} from '../src/plugins/dotnet'

describe('default test', () => {
    it('should pass', () => {
        getPackageDetails('System.Text.Json')
    })
})