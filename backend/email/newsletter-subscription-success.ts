import { MailTemplate } from "./mail-template";
import * as fs from 'fs';
import * as config from 'config';

export class MailNewsletterSubscriptionSuccess extends MailTemplate {

    serverBaseUrl = config.get('generic.APPLICATION_URL') as string;

    constructor(private unsubscribe: string) {
        super();
    }

    getHtmlContent(): string {
        let content = fs.readFileSync(__dirname + "/templates/content-newsletter-subscription-success.html", { encoding: 'utf-8' });

        let baseTemplate = fs.readFileSync(__dirname + "/templates/base-template.html", { encoding: 'utf-8' })
            .replace("{content}", content)
            .replace("{subject}", "Newsletter Anmeldung erfolgreich")
            .replace("{subjectTitle}", "Newsletter Anmeldung erfolgreich")
            .replace("{adminAction}", "")
            .replace("{unsubscribeLink}", this.unsubscribe);

        return baseTemplate
            .replace("{serverBaseURL}", this.serverBaseUrl)
    }
    getTextContent(): string {
        return "Du wurdest erfolgreich zu unserem Newsletter angemeldet.";
    }

    getSubject(): string {
        return "Newsletter: Anmeldung erfolgreich!";
    }
}