import { MailTemplate } from "./mail-template";
import * as fs from 'fs';
import * as config from 'config';

export class MailNewsletterEndSubscription extends MailTemplate {

    serverBaseUrl = config.get('generic.APPLICATION_URL') as string;

    constructor(private subscribeUrl: string) {
        super();
    }

    getHtmlContent(): string {
        let content = fs.readFileSync(__dirname + "/templates/content-newsletter-subscription-ended.html", { encoding: 'utf-8' })
            .replace("{subscriptionLink}", this.subscribeUrl);

        let baseTemplate = fs.readFileSync(__dirname + "/templates/base-template.html", { encoding: 'utf-8' })
            .replace("{content}", content)
            .replace("{subject}", "Newsletter Abmeldung erfolgreich")
            .replace("{subjectTitle}", "Newsletter Abmeldung erfolgreich")
            .replace("{adminAction}", "");

        return baseTemplate
            .replace("{serverBaseURL}", this.serverBaseUrl)
    }
    getTextContent(): string {
        return "Du wurdest erfolgreich von unserem Newsletter abgemeldet. Solltest Du zukünftig wieder Nachrichten von uns wünschen, kannst Du den Newsletter wieder direkt auf unserer Seite abonnieren: " + this.subscribeUrl;
    }

    getSubject(): string {
        return "Newsletter: Abmeldung erfolgreich!";
    }
}