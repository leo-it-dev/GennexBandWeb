import { MailTemplate } from "./mail-template";

export class MailContactNewMessage extends MailTemplate {

    constructor(private firstName: string, private lastName: string, private email: string, private message: string) {
        super({
            mailFeatures: [],
            subject: "Web: Kontaktanfrage",
            subjectTitle: "Web: Kontaktanfrage"
        });
    }

    getHtmlContent(): string {
        return this.getTemplate("content-contact-new-message")
            .replace("{firstName}", this.firstName)
            .replace("{lastName}", this.lastName)
            .replace("{email}", this.email)
            .replace("{message}", this.message);
    }

    getTextContent(): string {
        return "\
Neue Anfrage über Kontaktformular: \n" + 
this.firstName + " " + this.lastName + "\n\
Email Addresse: " + this.email + "\n\
Anfrage: --------\n\
" + this.message + "\n\
--------------------";
    }

    getSubject(): string {
        return "(Web) Kontaktanfrage";
    }
}