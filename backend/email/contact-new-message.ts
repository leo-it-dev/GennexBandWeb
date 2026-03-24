import { MailTemplate } from "./mail-template";
import * as config from 'config';
import * as fs from 'fs';

export class MailContactNewMessage extends MailTemplate {

    serverBaseUrl = config.get('generic.APPLICATION_URL') as string;

    constructor(private firstName: string, private lastName: string, private email: string, private message: string) {
        super();
    }

    getHtmlContent(): string {

        let content = fs.readFileSync(__dirname + "/templates/content-contact-new-message.html", { encoding: 'utf-8' })
            .replace("{firstName}", this.firstName)
            .replace("{lastName}", this.lastName)
            .replace("{email}", this.email)
            .replace("{message}", this.message);

        let baseTemplate = fs.readFileSync(__dirname + "/templates/base-template.html", { encoding: 'utf-8' })
            .replace("{content}", content)
            .replace("{subject}", "Neue Anfrage per Kontaktformular")
            .replace("{subjectTitle}", "Anfrage per Kontaktformular")
            .replace("{adminAction}", "");

        return baseTemplate
            .replace("{serverBaseURL}", this.serverBaseUrl)
    }

    getTextContent(): string {
        return "\
            Neue Anfrage über Kontaktformular: " + this.firstName + " " + this.lastName + "\
            Email Addresse: " + this.email + "\
            Anfrage: --------\
            " + this.message + "\
            --------------------";
    }

    getSubject(): string {
        return "(Web) Kontaktanfrage";
    }
}