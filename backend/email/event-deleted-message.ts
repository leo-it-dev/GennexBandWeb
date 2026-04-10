import { CalendarEntry } from "../../api_common/calendar";
import { CalendarEntryChangeToken } from "../modules/calendar/api_calendar";
import { MailFeaturePosition, MailFeaturePublishEventToSubscribers, MailFeatureUnsubscribeButton, MailTemplate } from "./mail-template";

export class MailDeletedEventMessage extends MailTemplate {
    
    constructor(private entry: CalendarEntry, private publicationLink: string|undefined, private unsubscribeLink: string|undefined) {
        super({
            mailFeatures: [
                publicationLink ?
                    new MailFeaturePublishEventToSubscribers(publicationLink, MailFeaturePosition.BELOW_MAIL) 
                : 
                    new MailFeatureUnsubscribeButton(unsubscribeLink!, MailFeaturePosition.FOOTER)
            ],
            subject: "Gennex Eventabsage",
            subjectTitle: "Gennex Eventabsage",
        });
    }

    getHtmlContent(): string {
        let dateStringOld = new Intl.DateTimeFormat("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Berlin",
        }).format(this.entry.date);

        let content = this.getTemplate("content-newsletter-message")
            .replace("{title}", "")
            .replace("{date}", "")
            .replace("{description}", "")
            .replace("{location}", "")
            .replace("{event_online_link}", "")

            .replace("{old_title}", this.entry.title)
            .replace("{old_date}", dateStringOld)
            .replace("{old_description}", this.entry.description)
            .replace("{old_location}", this.entry.locationString);

        return content;
    }

    getTextContent(): string {
        return "Eventabsage: \n\
Was? " + this.entry.title + "\n\
Wann? " + this.entry.date.toLocaleString("de-DE") + "\n\
Wo? " + this.entry.locationString + "\n\
Infos: " + this.entry.description;
    }
}