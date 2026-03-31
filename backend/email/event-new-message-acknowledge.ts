import { MailTemplate } from "./mail-template";

export class MailContactNewMessageAcknowledge extends MailTemplate {

    constructor(private message: string) {
        super({
            mailFeatures: [],
            subject: "Web: Kontaktanfrage",
            subjectTitle: "Web: Kontaktanfrage"
        });
    }

    getHtmlContent(): string {
        return this.getTemplate("content-contact-new-message-acknowledge")
            .replace("{message}", this.message);
    }

    getTextContent(): string {
        return "Vielen Dank für Deine Kontaktanfrage: \n" + this.message + "\n. Wir werden uns schnellstmöglich bei Dir melden!";
    }

    getSubject(): string {
        return "(Web) Kontaktanfrage";
    }
}