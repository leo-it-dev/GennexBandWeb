import { ApiInterfaceContactIn, ApiInterfaceContactOut } from "../../../api_common/contact";
import { ApiInterfaceGalleryIn, ApiInterfaceGalleryOut } from "../../../api_common/gallery";
import { contactFormularRequestVerification, ContactFormularStatusCodes } from "../../../api_common/verification";
import { ApiModule } from "../../api_module";
import { generateContactEmailVerifyCode, validateContactEmailVerifyCode } from "../../contact_verification_token";
import * as config from 'config';
import * as mailer from '../../mailer';

enum CaptchaVerificationResult {
    SUCCESS,
    CAPTCHA_INVALID,
    CAPTCHA_COMMUNICATION_ERROR
}

export class ApiModuleContact extends ApiModule {

    initialize() {

    }

    modname(): string {
        return "contact";
    }

    registerEndpoints(): void {
        this.postJson<ApiInterfaceContactIn, ApiInterfaceContactOut>("contact", async req => {

            console.log("Received contact request:", req.body);

            if (!contactFormularRequestVerification.verify(req.body)) {
                return {
                    error: 'Your request is malformed or your request data is too big!',
                    statusCode: ContactFormularStatusCodes.MALFORMED_REQUEST,
                    responseObject: {}
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
                        statusCode: ContactFormularStatusCodes.EMAIL_VERIFICATION_CODE_INVALID,
                        responseObject: {}
                    }
                }
            } else {
                let result = await this.verifyCaptcha(req.body.captcha);
                switch (result) {
                    case CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR:
                        return {
                            error: 'Error verifying captcha!',
                            statusCode: ContactFormularStatusCodes.INTERNAL_SERVER_ERROR,
                            responseObject: {}
                        }
                    case CaptchaVerificationResult.CAPTCHA_INVALID:
                        return {
                            error: 'HCaptcha reponse invalid!',
                            statusCode: ContactFormularStatusCodes.CAPTCHA_INVALID,
                            responseObject: {}
                        }
                    case CaptchaVerificationResult.SUCCESS:
                        // TODO: Check if user mail is already verified.
                        let alreadyVerified = false;

                        finalAction = alreadyVerified ? ContinuationAction.FINAL_SEND_MESSAGE : ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE;
                        break;
                }
            }

            switch (finalAction) {
                case ContinuationAction.FINAL_SEND_MESSAGE:
                    let finalMessageStr = "Neue Anfrage über Kontaktformular: \
" + req.body.firstName + " " + req.body.surName + "<br/> \
Email Addresse: " + req.body.email + "<br/>\
Anfrage: --------<br/>\
" + req.body.message + "<br/>\
--------------------<br/>";

                    await mailer.sendEmail([config.get('mail.SMTP_USERNAME')], "(Web) Kontaktanfrage", finalMessageStr, finalMessageStr);

                    return {
                        error: undefined,
                        statusCode: ContactFormularStatusCodes.MESSAGE_SENT,
                        responseObject: {}
                    }
                case ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE:
                    let verificationCode = generateContactEmailVerifyCode(req.body.email);
                    await mailer.sendEmail([req.body.email], "Bitte verifiziere deine E-Mail Addresse!", "Dein Verifikationscode: " + verificationCode, "<h5> Dein Verifikations Code: </h5><center><br><h1>" + verificationCode + "</h1></center>");


                    return {
                        error: undefined,
                        statusCode: ContactFormularStatusCodes.EMAIL_VERIFICATION_REQUIRED,
                        responseObject: {}
                    }
                    break;
            }
        });
    }

    async verifyCaptcha(captchaToken: string): Promise<CaptchaVerificationResult> {
        return new Promise<CaptchaVerificationResult>((res, _) => {
            const params = new URLSearchParams();
            params.append('secret', config.get("generic.HCAPTCHA_SECRET"));
            params.append('response', captchaToken);

            fetch("https://hcaptcha.com/siteverify", {
                method: "POST",
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(async dat => {
                let json = await dat.json();

                if (!dat.ok) {
                    console.error("Error communicating with hcaptcha page!: " + dat.status + ":" + json);
                    res(CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR);
                    return;
                }

                if (json.success) { // HCaptcha verify successfull
                    res(CaptchaVerificationResult.SUCCESS);
                    return;
                } else {
                    res(CaptchaVerificationResult.CAPTCHA_INVALID);
                    return;
                }
            }).catch(err => {
                console.log(err);
                res(CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR);
                return;
            })
        });
    }
}