import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint config */

export interface ApiInterfaceConfigIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceConfigOut extends ApiModuleInterfaceB2F { hcaptcha_key: string };