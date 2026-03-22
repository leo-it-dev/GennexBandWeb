import { MailTemplate } from "./mail-template";

export class MailNewsletterVerifyCode extends MailTemplate {

    constructor(private verificationCode: string) {
        super();
    }

    getHtmlContent(): string {
        return "<h5>Dein Verifikations Code: </h5><center><br><h1>" + this.verificationCode + "</h1></center>"
    }

    getTextContent(): string {
        return "Dein Verifikationscode: " + this.verificationCode;
    }

    getSubject(): string {
        return "Newsletter: Bitte verifiziere deine E-Mail Addresse!";
    }

}