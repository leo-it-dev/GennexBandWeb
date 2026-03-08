import { getFilePathFrontend } from "../..";
import { ApiInterfaceConfigIn, ApiInterfaceConfigOut } from "../../../api_common/config";
import { ApiModule } from "../../api_module";
import * as config from 'config';

export class ApiModuleConfig extends ApiModule {

    initialize() {

    }

    modname(): string {
        return "config";
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceConfigIn, ApiInterfaceConfigOut>("config", async req => {
            return {
                statusCode: 200,
                error: undefined,
                responseObject: {
                    hcaptcha_key: config.get("generic.HCAPTCHA_SITEKEY")
                }
            }
        });
    }
}
