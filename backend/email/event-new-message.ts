import { CalendarEntry } from "../../api_common/calendar";
import { MailFeaturePosition, MailFeaturePublishEventToSubscribers, MailTemplate } from "./mail-template";

export class MailNewEventMessage extends MailTemplate {
    
    constructor(private entry: CalendarEntry, private publicationLink: string|undefined, private includePublishButton) {
        super({
            mailFeatures: includePublishButton ? [
                new MailFeaturePublishEventToSubscribers(publicationLink, MailFeaturePosition.BELOW_MAIL),
            ] : [],
            subject: "Gennex Eventankündigung",
            subjectTitle: "Gennex Eventankündigung",
        });
    }

    getHtmlContent(): string {
        let content = this.getTemplate("content-newsletter-new-message")
            .replace("{title}", this.entry.title)
            .replace("{date}", this.entry.date.toLocaleString("de-DE"))
            .replace("{description}", this.entry.description)
            .replace("{location}", this.entry.locationString);

        return content;
    }

    getTextContent(): string {
        return "" + this.entry.title
                + " " + this.entry.description 
                + " Wann? " + this.entry.date.toLocaleString("de-DE")
                + " Wo? " + this.entry.locationString
    }
}