import { MailTemplate } from "./mail-template";

export class MailNewsletterEndSubscription extends MailTemplate {

    constructor(private subscribeUrl: string) {
        super({
            mailFeatures: [],
            subject: "Newsletter: Abmeldung erfolgreich!",
            subjectTitle: "Newsletter: Abmeldung erfolgreich!"
        });
    }

    getHtmlContent(): string {
        return this.getTemplate("content-newsletter-subscription-ended")
            .replace("{subscriptionLink}", this.subscribeUrl);
    }
    getTextContent(): string {
        return "Du wurdest erfolgreich von unserem Newsletter abgemeldet. Solltest Du zukünftig wieder Nachrichten von uns wünschen, kannst Du den Newsletter wieder direkt auf unserer Seite abonnieren: " + this.subscribeUrl;
    }
}