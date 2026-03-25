import { MailTemplate } from "./mail-template";

export class MailNewsletterVerifyCode extends MailTemplate {

    constructor(private verificationCode: string) {
        super({
            mailFeatures: [],
            subject: "Newsletter: Bitte verifiziere deine E-Mail Addresse!",
            subjectTitle: "Newsletter: Bitte verifiziere deine E-Mail Addresse!"
        })
    }

    getHtmlContent(): string {
        return this.getTemplate("content-verification-code")
            .replace("{verificationCode}", this.verificationCode);
    }

    getTextContent(): string {
        return "Dein Verifikationscode: " + this.verificationCode;
    }
}