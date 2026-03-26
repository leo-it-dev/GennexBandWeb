import * as config from 'config';
import { ApiInterfaceContactIn, ApiInterfaceContactOut } from "../../../api_common/contact";
import { contactFormularRequestVerification, ContactFormularStatusCodes } from "../../../api_common/verification";
import { ApiModule } from "../../api_module";
import { generateContactEmailVerifyCode, validateContactEmailVerifyCode } from "../../contact_verification_token";
import { CaptchaVerificationResult, verifyCaptcha } from '../../framework/captcha_helper';
import { MailContactNewMessage } from '../../email/contact-new-message';
import { MailContactVerificationCode } from '../../email/contact-verification-code-message';
import { ApiModuleMailer } from '../mailer/api_mailer';
import { getApiModule } from '../..';
import { MailContactNewMessageAcknowledge } from '../../email/event-new-message-acknowledge';

export class ApiModuleContact extends ApiModule {

    mailer: ApiModuleMailer;

    initialize() {
        this.mailer = getApiModule(ApiModuleMailer);
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
                    statusCode: 400,
                    responseObject: { result: ContactFormularStatusCodes.MALFORMED_REQUEST }
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
                        responseObject: { result: ContactFormularStatusCodes.EMAIL_VERIFICATION_CODE_INVALID }
                    }
                }
            } else {
                let result = await verifyCaptcha(req.body.captcha);
                switch (result) {
                    case CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR:
                        return {
                            error: 'Error verifying captcha!',
                            statusCode: 200,
                            responseObject: { result: ContactFormularStatusCodes.INTERNAL_SERVER_ERROR }
                        }
                    case CaptchaVerificationResult.CAPTCHA_INVALID:
                        return {
                            error: 'HCaptcha reponse invalid!',
                            statusCode: 200,
                            responseObject: { result: ContactFormularStatusCodes.CAPTCHA_INVALID }
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
                    let mail = new MailContactNewMessage(req.body.firstName, req.body.surName, req.body.email, req.body.message);
                    let mailAck = new MailContactNewMessageAcknowledge(req.body.message);
                    await this.mailer.sendEmailImmediately(mail.toBatchMail([config.get('mail.SMTP_USERNAME')]));
                    await this.mailer.sendEmailImmediately(mailAck.toBatchMail([req.body.email]));

                    return {
                        error: undefined,
                        statusCode: 200,
                        responseObject: { result: ContactFormularStatusCodes.MESSAGE_SENT }
                    }
                case ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE:
                    let verificationCode = generateContactEmailVerifyCode(req.body.email);
                    let mail2 = new MailContactVerificationCode(verificationCode);
                    await this.mailer.sendEmailImmediately(mail2.toBatchMail([req.body.email]));


                    return {
                        error: undefined,
                        statusCode: 200,
                        responseObject: { result: ContactFormularStatusCodes.EMAIL_VERIFICATION_REQUIRED }
                    }
            }
        });
    }
}