import { CalendarEntry } from "../../api_common/calendar";
import { MailTemplate } from "./mail-template";
import * as fs from 'fs';
import * as config from 'config';

export class MailNewEventMessage extends MailTemplate {
    
    serverBaseUrl = config.get('generic.APPLICATION_URL') as string;

    constructor(private entry: CalendarEntry, private publicationLink: string|undefined) {
        super();
    }

    getHtmlContent(): string {
        let content = fs.readFileSync(__dirname + "/templates/content-newsletter-new-message.html", { encoding: 'utf-8' })
            .replace("{title}", this.entry.title)
            .replace("{description}", this.entry.description)
            .replace("{date}", this.entry.date.toLocaleDateString("de-DE"))
            .replace("{location}", this.entry.locationString);

        let actionAdminPublishNewsletter = fs.readFileSync(__dirname + "/templates/action-publish-newsletter.html", { encoding: 'utf-8' })
            .replace("{publicationLink}", "https.//gennex.band:443/bla");

        let baseTemplate = fs.readFileSync(__dirname + "/templates/base-template.html", { encoding: 'utf-8' })
            .replace("{content}", content)
            .replace("{subject}", "Neue Eventankündigung")
            .replace("{subjectTitle}", "Neue Eventankündigung")
            .replace("{adminAction}", actionAdminPublishNewsletter);

        return baseTemplate
            .replace("{serverBaseURL}", this.serverBaseUrl);
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