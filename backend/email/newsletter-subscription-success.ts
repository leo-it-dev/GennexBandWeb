import { MailTemplate } from "./mail-template";

export class MailNewsletterSubscriptionSuccess extends MailTemplate {

    constructor(private unsubscribe: string) {
        super();
    }

    getHtmlContent(): string {
        return "<h3>Du wurdest erfolgreich zu unserem Newsletter angemeldet.<br><h5><a href=\"" + this.unsubscribe + "\">Hier Newsletter abbestellen</a></h5></h3>"
    }

    getTextContent(): string {
        return "Du wurdest erfolgreich zu unserem Newsletter angemeldet. Newsletter hier abmelden: " + this.unsubscribe;
    }

    getSubject(): string {
        return "Newsletter: Anmeldung erfolgreich!";
    }

}