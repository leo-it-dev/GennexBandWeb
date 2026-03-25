import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"
import { SubscribeFormularStatusCodes, UnsubscribeFormularStatusCodes } from "./verification"

/* Api endpoint subscribe */
export interface ApiInterfaceSubscribeIn extends ApiModuleInterfaceF2B {
    email: string
    captcha: string
    mailVerificationCode: string
};
export interface ApiInterfaceSubscribeOut extends ApiModuleInterfaceB2F {
    result: SubscribeFormularStatusCodes
};

export interface ApiInterfaceUnsubscribeIn extends ApiModuleInterfaceF2B {
    token: string
};
export interface ApiInterfaceUnsubscribeOut extends ApiModuleInterfaceB2F {
    result: UnsubscribeFormularStatusCodes
};
