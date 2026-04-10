import { getApiModule, getBaseURL } from '../..';
import { ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut, ApiInterfaceUnsubscribeIn, ApiInterfaceUnsubscribeOut } from '../../../api_common/subscribe';
import { subscribeFormularRequestVerification, SubscribeFormularStatusCodes, unsubscribeFormularRequestVerification, UnsubscribeFormularStatusCodes } from '../../../api_common/verification';
import { ApiModule } from "../../api_module";
import { generateContactEmailVerifyCode, validateContactEmailVerifyCode } from "../../contact_verification_token";
import { MailNewsletterEndSubscription } from '../../email/newsletter-end-subscription-message';
import { MailNewsletterSubscriptionSuccess } from '../../email/newsletter-subscription-success';
import { MailNewsletterVerifyCode } from '../../email/newsletter-verification-code-message';
import { CaptchaVerificationResult, verifyCaptcha } from '../../framework/captcha_helper';
import { generateJWTtoken, validateJWTtokenExtractPayload } from '../../framework/jwt';
import { SqlUpdate } from '../../framework/sqlite_database';
import { ApiModuleMailer } from '../mailer/api_mailer';

export class ApiModuleSubscribe extends ApiModule {

    mailer?: ApiModuleMailer;

    initialize() {
        this.mailer = getApiModule(ApiModuleMailer);
    }

    getMailerModule(): ApiModuleMailer {
        if (this.mailer) {
            return this.mailer;
        }
        throw new Error("Error reading in mailer module as it is not yet initialized!");
    }

    modname(): string {
        return "subscribe";
    }

    protected sqliteTableCreate(): SqlUpdate[] | undefined {
        return [{
            params: [],
            update: "CREATE TABLE IF NOT EXISTS subscriptions (\
                        mail varchar(100) NOT NULL UNIQUE \
                    \);"
        }];
    }

    getAllSubscriptions(): string[] {
        return this.sqlite().sqlFetchAll("SELECT mail FROM subscriptions", []).map(m => m['mail']);
    }

    addSubscription(mail: string) {
        this.sqlite().sqlUpdate({
            update: "INSERT INTO subscriptions (mail) VALUES (?)",
            params: [
                mail
            ]
        });
    }

    isEmailRegistered(mail: string): boolean {
        return this.sqlite().sqlFetchAll("SELECT mail FROM subscriptions WHERE mail=?", [mail]).length > 0;
    }

    removeSubscription(mail: string) {
        if (!mail || mail.trim().length == 0) {
            throw Error("Trying to delete subscription without specifying any mail address!");
        }

        this.sqlite().sqlUpdate({
            update: "DELETE FROM subscriptions WHERE mail=?",
            params: [
                mail
            ]
        });
    }

    emailToToken(email: string) {
        return generateJWTtoken({ email: email });
    }

    tokenToEmail(token: any) {
        return token['email'];
    }

    generateUnsubscribeUrl(email: string) {
        return getBaseURL() + "unsubscribe?t=" + this.emailToToken(email);
    }
    getSubscribeUrl() {
        return getBaseURL() + "#channels";
    }

    registerEndpoints(): void {
        /*
        ============================================
        =============== SUBSCRIPTION ===============
        ============================================
        */

        this.postJson<ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut>("subscribe", async req => {

            console.log("Received subscription request:", req.body);

            if (!subscribeFormularRequestVerification.verify(req.body)) {
                return {
                    error: 'Your request is malformed or your request data is too big!',
                    statusCode: 400,
                    responseObject: { result: SubscribeFormularStatusCodes.MALFORMED_REQUEST }
                }
            }

            /* verification flow:
                - User is not yet registered:
                -   /contact with captcha data without mailVerificationCode
                -   We check the captcha, if it is correct, we send the user an email with a random verification code. We cache the code for 15 minutes.
                -   User calls /contact again without valid captcha but with correct emailVerificationCode. We accept the request without checking captcha again, register user email and send message to gennex.
                - User's mail is already registered:
                -   /contact with captcha data without mailVerificationCode
                -   We verify captcha, if it is correct we send message to gennex.
            */

            // Possible return codes:
            // - 200: Success, message sent
            // - 401 Email Authentication Required. We sent a mail to the user's email address with a verification code.
            // - 403 Captcha invalid. User did not provide a email verification token. Given captcha was not solved correctly.
            // - 404 Email Verification Code is invalid. User provided a mail verification code but it was wrong.
            // - 500 Internal server error. Some internal server error, user should try later again or use other communication channel.

            enum ContinuationAction {
                FINAL_SEND_MESSAGE,
                SEND_EMAIL_VERIFICATION_MESSAGE,
                NONE
            }

            let finalAction: ContinuationAction = ContinuationAction.NONE;

            if (req.body.mailVerificationCode != '') {
                // TODO: Check if user mail is already verified. Then simply ignore this part.

                // User tries to send message and validate it's email address.
                if (validateContactEmailVerifyCode(req.body.email, req.body.mailVerificationCode)) {
                    finalAction = ContinuationAction.FINAL_SEND_MESSAGE;
                } else {
                    return {
                        error: 'Your provided verification code is incorrect!',
                        statusCode: 200,
                        responseObject: { result: SubscribeFormularStatusCodes.EMAIL_VERIFICATION_CODE_INVALID }
                    }
                }
            } else {
                let result = await verifyCaptcha(req.body.captcha);
                switch (result) {
                    case CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR:
                        return {
                            error: 'Error verifying captcha!',
                            statusCode: 200,
                            responseObject: { result: SubscribeFormularStatusCodes.INTERNAL_SERVER_ERROR }
                        }
                    case CaptchaVerificationResult.CAPTCHA_INVALID:
                        return {
                            error: 'HCaptcha reponse invalid!',
                            statusCode: 200,
                            responseObject: { result: SubscribeFormularStatusCodes.CAPTCHA_INVALID }
                        }
                    case CaptchaVerificationResult.SUCCESS:
                        try {
                            if (this.isEmailRegistered(req.body.email)) {
                                return {
                                    error: undefined,
                                    statusCode: 200,
                                    responseObject: { result: SubscribeFormularStatusCodes.ALREADY_REGISTERED }
                                }
                            } else {
                                finalAction = ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE;
                            }
                        } catch (e) {
                            return {
                                error: 'Internal error checking if email is already registered!',
                                statusCode: 200,
                                responseObject: { result: SubscribeFormularStatusCodes.INTERNAL_SERVER_ERROR }
                            }
                        }
                        break;
                }
            }

            switch (finalAction) {
                case ContinuationAction.FINAL_SEND_MESSAGE:
                    try {
                        this.addSubscription(req.body.email);

                        console.log("Successfully got subscription: ", req.body);

                        let unsubscribe = this.generateUnsubscribeUrl(req.body.email);
                        let mail = new MailNewsletterSubscriptionSuccess(unsubscribe);
                        await this.getMailerModule().sendEmailImmediately(mail.toBatchMail([req.body.email]));
                        return {
                            error: undefined,
                            statusCode: 200,
                            responseObject: { result: SubscribeFormularStatusCodes.MESSAGE_SENT }
                        }
                    } catch (e) {
                        this.logger().error("Error registering email in database: ", { mail: req.body.email, error: e });
                        return {
                            error: 'Error registering email in database!',
                            statusCode: 200,
                            responseObject: { result: SubscribeFormularStatusCodes.INTERNAL_SERVER_ERROR }
                        }
                    }
                case ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE:
                    let verificationCode = generateContactEmailVerifyCode(req.body.email);
                    let mail = new MailNewsletterVerifyCode(verificationCode);
                    await this.getMailerModule().sendEmailImmediately(mail.toBatchMail([req.body.email]));

                    return {
                        error: undefined,
                        statusCode: 200,
                        responseObject: { result: SubscribeFormularStatusCodes.EMAIL_VERIFICATION_REQUIRED }
                    }
            }
        });


        /*
        ============================================
        ============== UNSUBSCRIPTION ==============
        ============================================
        */


        this.postJson<ApiInterfaceUnsubscribeIn, ApiInterfaceUnsubscribeOut>("unsubscribe", async req => {

            console.log("Received unsubscription request:", req.body);

            if (!unsubscribeFormularRequestVerification.verify(req.body)) {
                return {
                    error: 'Your request is malformed or your request data is too big!',
                    statusCode: 400,
                    responseObject: { result: UnsubscribeFormularStatusCodes.MALFORMED_REQUEST }
                }
            }

            let token = validateJWTtokenExtractPayload(req.body.token);
            if (token) {
                let email = this.tokenToEmail(token);
                try {
                    if (this.isEmailRegistered(email)) {
                        this.removeSubscription(email)
                        let subscribeUrl = this.getSubscribeUrl();

                        let mail = new MailNewsletterEndSubscription(subscribeUrl);
                        await this.getMailerModule().sendEmailImmediately(mail.toBatchMail([email]));

                        return {
                            error: undefined,
                            statusCode: 200,
                            responseObject: { result: UnsubscribeFormularStatusCodes.UNSUBSCRIBE_SUCCESS }
                        }
                    } else {
                        return {
                            error: 'Your email is not registered!',
                            statusCode: 200,
                            responseObject: { result: UnsubscribeFormularStatusCodes.ACCOUNT_NOT_FOUND }
                        }
                    }
                } catch (e) {
                    this.logger().error("Error deleting user subscription: ", { token: token, error: e });
                    return {
                        error: 'Error deleting your subscription!',
                        statusCode: 200,
                        responseObject: { result: UnsubscribeFormularStatusCodes.INTERNAL_SERVER_ERROR }
                    }
                }
            } else {
                return {
                    error: 'Your token is invalid, malformed or not signed by our current crypto backend!',
                    statusCode: 200,
                    responseObject: { result: UnsubscribeFormularStatusCodes.TOKEN_INVALID }
                }
            }
        });
    }
}