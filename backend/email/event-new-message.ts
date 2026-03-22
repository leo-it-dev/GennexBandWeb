import { CalendarEntry } from "../../api_common/calendar";
import { MailTemplate } from "./mail-template";
import * as fs from 'fs';

export class MailNewEventMessage extends MailTemplate {

    constructor(private entry: CalendarEntry, private publicationLink: string|undefined) {
        super();
    }

    getHtmlContent(): string {
        return fs.readFileSync(__dirname + "/templates/newsletter-new-message.html", {
            encoding: 'utf-8'
        })
        .replace("{title}", this.entry.title)
        .replace("{description}", this.entry.description)
        .replace("{date}", this.entry.date.toLocaleDateString("de-DE"))
        .replace("{location}", this.entry.locationString)
        .replace("{publicationLink}", "https.//gennex.band:443/bla");
    }

    getTextContent(): string {
        return "" + this.entry.title
                + " " + this.entry.description 
                + " Wann? " + this.entry.date.toLocaleString("de-DE")
                + " Wo? " + this.entry.locationString
    }

    getSubject(): string {
        return "Gennex Eventankündigung";
    }
}