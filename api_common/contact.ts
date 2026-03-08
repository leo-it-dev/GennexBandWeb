import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint contact */

export interface ApiInterfaceContactIn extends ApiModuleInterfaceF2B { 
    firstName: string,
    surName: string,
    email: string,
    message: string,
    captcha: string,
    mailVerificationCode: string
};
export interface ApiInterfaceContactOut extends ApiModuleInterfaceB2F {  };