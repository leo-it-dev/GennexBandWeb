import { CalendarEntry } from "../../api_common/calendar";
import { CalendarEntryChangeToken } from "../modules/calendar/api_calendar";
import { MailFeaturePosition, MailFeaturePublishEventToSubscribers, MailFeatureShowOnlineEvent, MailFeatureUnsubscribeButton, MailTemplate } from "./mail-template";

export class MailModifiedEventMessage extends MailTemplate {
    
    constructor(private entryNew: CalendarEntry, private changesToNew: CalendarEntryChangeToken, private publicationLink: string|undefined, private unsubscribeLink: string|undefined, private publicEventURL: string) {
        super({
            mailFeatures: [
                new MailFeatureShowOnlineEvent(publicEventURL, MailFeaturePosition.CONTENT),
                publicationLink ?
                    new MailFeaturePublishEventToSubscribers(publicationLink, MailFeaturePosition.BELOW_MAIL) 
                : 
                    new MailFeatureUnsubscribeButton(unsubscribeLink!, MailFeaturePosition.FOOTER)
            ],
            subject: "Gennex Event-Änderung",
            subjectTitle: "Gennex Event-Änderung",
        });
    }

    getHtmlContent(): string {
        let dateStringNew = new Intl.DateTimeFormat("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Berlin",
        }).format(this.entryNew.date);
        let dateStringOld = new Intl.DateTimeFormat("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Berlin",
        }).format(new Date(this.changesToNew.oldDate || 0));

        let content = this.getTemplate("content-newsletter-message")
            .replace("{title}", this.entryNew.title)
            .replace("{date}", dateStringNew)
            .replace("{description}", this.entryNew.description)
            .replace("{location}", this.entryNew.locationString)
            .replace("{event_online_link}", this.publicEventURL)

            .replace("{old_title}", this.changesToNew.oldTitle ? this.changesToNew.oldTitle : "")
            .replace("{old_date}", this.changesToNew.oldDate ? dateStringOld : "")
            .replace("{old_description}", this.changesToNew.oldDescription ? this.changesToNew.oldDescription : "")
            .replace("{old_location}", this.changesToNew.oldLocation ? this.changesToNew.oldLocation : "");

        return content;
    }

    getTextContent(): string {
        return "Eventänderung: \n\
Bisherige Eventdetails: \n\
" + (this.changesToNew.oldTitle ? ("Was? " + this.changesToNew.oldTitle) : "") + "\n\
" + (this.changesToNew.oldLocation ? ("Wo? " + this.changesToNew.oldLocation) : "") + "\n\
" + (this.changesToNew.oldDate ? ("Wann? " + this.changesToNew.oldDate) : "") + "\n\
" + (this.changesToNew.oldDescription ? ("Infos: " + this.changesToNew.oldDescription) : "") + "\n\
\
Aktualisierte Eventdetails: \n\
\n\
Was?" + this.entryNew.title + "\n\
Wo? " + this.entryNew.locationString + "\n\
Wann? " + this.entryNew.date.toLocaleString("de-DE") + "\n\
Infos:" + this.entryNew.description;
    }
}