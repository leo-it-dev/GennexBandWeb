import { MailTemplate } from "./mail-template";

export class MailContactVerificationCode extends MailTemplate {

    constructor(private verificationCode: string) {
        super({
            mailFeatures: [],
            subject: "Kontakt: Bitte verifiziere deine E-Mail Addresse!",
            subjectTitle: "Kontakt: Bitte verifiziere deine E-Mail Addresse!"
        });
    }

    getHtmlContent(): string {
        return this.getTemplate("content-verification-code").replace("{verificationCode}", this.verificationCode);
    }

    getTextContent(): string {
        return "Dein Verifikationscode: " + this.verificationCode;
    }
}