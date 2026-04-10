import * as config from 'config';
import { ApiInterfaceConfigIn, ApiInterfaceConfigOut } from "../../../api_common/config";
import { ApiModule } from "../../api_module";

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
