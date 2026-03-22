import { MailTemplate } from "./mail-template";

export class MailNewsletterEndSubscription extends MailTemplate {

    constructor(private subscribeUrl: string) {
        super();
    }

    getHtmlContent(): string {
        return "<h3>Du wurdest erfolgreich von unserem Newsletter abgemeldet.<br>Solltest Du zukünftig wieder Nachrichten von uns wünschen, kannst Du den Newsletter wieder direkt auf unserer Seite abonnieren: <a href=\"" + this.subscribeUrl + "\">Hier zum Newsletter anmelden</a></h3>"
    }

    getTextContent(): string {
        return "Du wurdest erfolgreich von unserem Newsletter abgemeldet. Solltest Du zukünftig wieder Nachrichten von uns wünschen, kannst Du den Newsletter wieder direkt auf unserer Seite abonnieren: " + this.subscribeUrl;
    }

    getSubject(): string {
        return "Newsletter: Abmeldung erfolgreich!";
    }
}