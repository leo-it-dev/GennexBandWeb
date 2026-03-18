import * as config from 'config';
import { ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut, ApiInterfaceUnsubscribeIn, ApiInterfaceUnsubscribeOut } from '../../../api_common/subscribe';
import { subscribeFormularRequestVerification, SubscribeFormularStatusCodes, unsubscribeFormularRequestVerification, UnsubscribeFormularStatusCodes } from '../../../api_common/verification';
import { ApiModule } from "../../api_module";
import { generateContactEmailVerifyCode, validateContactEmailVerifyCode } from "../../contact_verification_token";
import * as mailer from '../../mailer';
import { CaptchaVerificationResult, verifyCaptcha } from '../../framework/captcha_helper';
import { SqlUpdate } from '../../framework/sqlite_database';
import { generateJWTtoken, validateJWTtokenExtractPayload } from '../../framework/jwt';

export class ApiModuleSubscribe extends ApiModule {

    initialize() {

    }

    modname(): string {
        return "subscribe";
    }

    protected sqliteTableCreate(): SqlUpdate | undefined {
        return {
            params: [],
            update: "CREATE TABLE IF NOT EXISTS subscriptions (\
                        mail varchar(100) NOT NULL UNIQUE \
                    \);"
        };
    }

    async getAllSubscriptions(): Promise<string[]> {
        return new Promise<string[]>((res, rej) => {
            this.sqlite().sqlFetchAll("SELECT mail FROM subscriptions", []).then(mails => {
                res(mails as string[]);
            }).catch(err => {
                rej(err);
            });
        });
    }

    async addSubscription(mail: string) {
        return new Promise<void>((res, rej) => {
            this.sqlite().sqlUpdate({
                update: "INSERT INTO subscriptions (mail) VALUES (?);",
                params: [
                    mail
                ]
            }).then(() => {
                res();
            }).catch(e => {
                rej(e);
            })
        });
    }

    async isEmailRegistered(mail: string): Promise<boolean> {
        return new Promise<boolean>((res, rej) => {
            this.sqlite().sqlFetchAll("SELECT mail FROM subscriptions WHERE mail=?", [mail]).then(email => {
                res(email.length > 0);
            }).catch(e => {
                rej(e);
            });
        });
    }

    async removeSubscription(mail: string) {
        return new Promise<void>((res, rej) => {

            if (!mail || mail.trim().length == 0) {
                rej();
            }

            this.sqlite().sqlUpdate({
                update: "DELETE FROM subscriptions WHERE mail=?;",
                params: [
                    mail
                ]
            }).then(() => {
                res();
            }).catch(e => {
                rej(e);
            })
        });
    }

    emailToToken(email: string) {
        return generateJWTtoken({ email: email });
    }

    tokenToEmail(token: object) {
        return token['email'];
    }

    generateUnsubscribeUrl(email: string) {
        let httpsPort = config.get("generic.HTTPS_PORT");
        return "https://" + config.get("generic.SERVE_DOMAIN") + (httpsPort != 443 ? ":" + httpsPort : "") + "/unsubscribe?t=" + this.emailToToken(email);
    }
    getSubscribeUrl() {
        let httpsPort = config.get("generic.HTTPS_PORT");
        return "https://" + config.get("generic.SERVE_DOMAIN") + (httpsPort != 443 ? ":" + httpsPort : "") + "/#channels";
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
                            if (await this.isEmailRegistered(req.body.email)) {
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
                    // let finalMessageStr = "TODO";
                    // await mailer.sendEmail([config.get('mail.SMTP_USERNAME')], "(Web) Kontaktanfrage", finalMessageStr, finalMessageStr);
                    try {
                        await this.addSubscription(req.body.email);

                        console.log("Successfully got subscription: ", req.body);

                        let unsubscribe = this.generateUnsubscribeUrl(req.body.email);
                        await mailer.sendEmail(
                            [req.body.email],
                            "Newsletter: Anmeldung erfolgreich!",
                            "Du wurdest erfolgreich zu unserem Newsletter angemeldet. Newsletter hier abmelden: " + unsubscribe,
                            "<h3>Du wurdest erfolgreich zu unserem Newsletter angemeldet.<br><h5><a href=\"" + unsubscribe + "\">Hier Newsletter abbestellen</a></h5></h3>"
                        );
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
                    await mailer.sendEmail([req.body.email], "Newsletter: Bitte verifiziere deine E-Mail Addresse!", "Dein Verifikationscode: " + verificationCode, "<h5> Dein Verifikations Code: </h5><center><br><h1>" + verificationCode + "</h1></center>");

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
                    if (await this.isEmailRegistered(email)) {
                        await this.removeSubscription(email)
                        let subscribeUrl = this.getSubscribeUrl();

                        await mailer.sendEmail(
                            [email],
                            "Newsletter: Abmeldung erfolgreich!",
                            "Du wurdest erfolgreich von unserem Newsletter abgemeldet. Solltest Du zukünftig wieder Nachrichten von uns wünschen, kannst Du den Newsletter wieder direkt auf unserer Seite abonnieren: " + subscribeUrl,
                            "<h3>Du wurdest erfolgreich von unserem Newsletter abgemeldet.<br>Solltest Du zukünftig wieder Nachrichten von uns wünschen, kannst Du den Newsletter wieder direkt auf unserer Seite abonnieren: <a href=\"" + subscribeUrl + "\">Hier zum Newsletter anmelden</a></h3>"
                        );

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