import { CalendarEntry } from "../../api_common/calendar";
import { MailFeaturePosition, MailFeaturePublishEventToSubscribers, MailFeatureUnsubscribeButton, MailTemplate } from "./mail-template";

export class MailNewEventMessage extends MailTemplate {
    
    constructor(private entry: CalendarEntry, private publicationLink: string|undefined, private includePublishButton, private unsubscribeLink, private eventOnlineLink) {
        super({
            mailFeatures: [
                includePublishButton ?
                    new MailFeaturePublishEventToSubscribers(publicationLink, MailFeaturePosition.BELOW_MAIL) 
                : 
                    new MailFeatureUnsubscribeButton(unsubscribeLink, MailFeaturePosition.FOOTER)
            ],
            subject: "Gennex Eventankündigung",
            subjectTitle: "Gennex Eventankündigung",
        });
    }

    getHtmlContent(): string {
        let dateString = new Intl.DateTimeFormat("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Berlin",
        }).format(this.entry.date);

        let content = this.getTemplate("content-newsletter-message")
            .replace("{title}", this.entry.title)
            .replace("{date}", dateString)
            .replace("{description}", this.entry.description)
            .replace("{location}", this.entry.locationString)
            .replace("{event_online_link}", this.eventOnlineLink)

            .replace("{old_title}", "")
            .replace("{old_date}", "")
            .replace("{old_description}", "")
            .replace("{old_location}", "");

        return content;
    }

    getTextContent(): string {
        return "" + this.entry.title
                + " " + this.entry.description
                + " Wann? " + this.entry.date.toLocaleString("de-DE")
                + " Wo? " + this.entry.locationString
    }
}