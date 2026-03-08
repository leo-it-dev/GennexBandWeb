import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint videos */

export interface ApiInterfaceVideosIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceVideosOut extends ApiModuleInterfaceB2F { videoURLs: string[] };