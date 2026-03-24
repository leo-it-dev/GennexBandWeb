import { MailTemplate } from "./mail-template";
import * as fs from 'fs';
import * as config from 'config';

export class MailNewsletterVerifyCode extends MailTemplate {

    serverBaseUrl = config.get('generic.APPLICATION_URL') as string;

    constructor(private verificationCode: string) {
        super();
    }

    getHtmlContent(): string {
        let content = fs.readFileSync(__dirname + "/templates/content-verification-code.html", { encoding: 'utf-8' })
            .replace("{verificationCode}", this.verificationCode);

        let baseTemplate = fs.readFileSync(__dirname + "/templates/base-template.html", { encoding: 'utf-8' })
            .replace("{content}", content)
            .replace("{subject}", "Newsletter: Dein Verifizierungscode")
            .replace("{subjectTitle}", "Newsletter: Dein Verifizierungscode")
            .replace("{adminAction}", "");

        return baseTemplate
            .replace("{serverBaseURL}", this.serverBaseUrl)
    }

    getTextContent(): string {
        return "Dein Verifikationscode: " + this.verificationCode;
    }

    getSubject(): string {
        return "Newsletter: Bitte verifiziere deine E-Mail Addresse!";
    }
}