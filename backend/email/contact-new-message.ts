import { MailTemplate } from "./mail-template";

export class MailContactNewMessage extends MailTemplate {

    constructor(private firstName: string, private lastName: string, private email: string, private message: string) {
        super();
    }

    getHtmlContent(): string {
        return "\
            Neue Anfrage über Kontaktformular: " + this.firstName + " " + this.lastName + "<br/>\
            Email Addresse: " + this.email + "<br/>\
            Anfrage: --------<br/>\
            " + this.message + "<br/>\
            --------------------<br/>";
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