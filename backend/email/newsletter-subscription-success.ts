import { MailFeaturePosition, MailFeatureUnsubscribeButton, MailTemplate } from "./mail-template";

export class MailNewsletterSubscriptionSuccess extends MailTemplate {

    constructor(private unsubscribe: string) {
        super({
            mailFeatures: [
                new MailFeatureUnsubscribeButton(unsubscribe, MailFeaturePosition.FOOTER)
            ],
            subject: "Newsletter: Anmeldung erfolgreich!",
            subjectTitle: "Newsletter: Anmeldung erfolgreich!",
        });
    }

    getHtmlContent(): string {
        return this.getTemplate("content-newsletter-subscription-success");
    }
    getTextContent(): string {
        return "Du wurdest erfolgreich zu unserem Newsletter angemeldet.";
    }
}