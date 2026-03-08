import { ApiInterfaceVideosIn, ApiInterfaceVideosOut } from "../../../api_common/videos";
import { ApiModule } from "../../api_module";
const config = require('config');

export class ApiModuleVideos extends ApiModule {

    modname(): string {
        return "videos";
    }

    async initialize() {}

    loginRequired(): boolean {
        return false;
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceVideosIn, ApiInterfaceVideosOut>("videos", async handler => {
            return {statusCode: 500, responseObject: { videoURLs: [] }, error: 'An internal error occurred!'};
        });
    }
}