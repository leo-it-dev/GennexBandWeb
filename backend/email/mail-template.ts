import * as fs from 'fs';
import config from 'config';
import { getBaseURL } from '..';
import { BatchEmail } from '../modules/mailer/api_mailer';

export enum MailFeaturePosition {
    CONTENT,
    FOOTER,
    BELOW_MAIL
}

export abstract class MailFeature {
    constructor(public positionInMail: MailFeaturePosition) {}
    abstract getContent(): string;
}

export class MailFeatureUnsubscribeButton extends MailFeature {
    constructor(private unsubscribeLink: string, positionInMail: MailFeaturePosition) { super(positionInMail) }

    getContent(): string {
        return fs.readFileSync(__dirname + "/templates/action-unsubscribe.html", { encoding: 'utf-8' })
                    .replace("{unsubscribeLink}", this.unsubscribeLink);
    }

}
export class MailFeaturePublishEventToSubscribers extends MailFeature {
    constructor(private publishEventLink: string, positionInMail: MailFeaturePosition) { super(positionInMail) }

    getContent(): string {
        return fs.readFileSync(__dirname + "/templates/action-publish-newsletter.html", { encoding: 'utf-8' })
            .replace("{publicationLink}", this.publishEventLink)
    }
}

export class MailFeatureShowOnlineEvent extends MailFeature {
    constructor(private eventOnlineLink: string, positionInMail: MailFeaturePosition) { super(positionInMail) }

    getContent(): string {
        return fs.readFileSync(__dirname + "/templates/action-show-online-event.html", { encoding: 'utf-8' })
            .replace("{event_online_link}", this.eventOnlineLink)
    }
}

export type BaseMail = {
    subject: string,
    subjectTitle: string,
    mailFeatures: MailFeature[]
}

export abstract class MailTemplate {

    constructor(protected baseMail: BaseMail) { }

    MAX_BATCH_RETRY_COUNT = config.get('mail.BATCH_MAIL_MAX_TRANSMIT_RETRIES') as number;

    getSubject() {
        return this.baseMail.subjectTitle;
    }

    abstract getTextContent(): string;
    abstract getHtmlContent(): string;

    getRenderedContentHTML(): string {
        let email = fs.readFileSync(__dirname + "/templates/base-template.html", { encoding: 'utf-8' })
            .replace("{subject}", this.baseMail.subject)
            .replace("{subjectTitle}", this.baseMail.subjectTitle)
            .replaceAll("{serverBaseURL}", getBaseURL());

        let content = this.getHtmlContent();
        let footer = "";
        let belowMail = "";

        for (let mailFeature of this.baseMail.mailFeatures) {
            switch(mailFeature.positionInMail) {
                case MailFeaturePosition.CONTENT:
                    content += mailFeature.getContent();
                    break;
                case MailFeaturePosition.FOOTER:
                    footer += mailFeature.getContent();
                    break;
                case MailFeaturePosition.BELOW_MAIL:
                    belowMail += mailFeature.getContent();
                    break;
            }
        }

        email = email.replace("{content}", content).replace("{footer}", footer).replace("{belowMail}", belowMail);
        return email;
    }

    getTemplate(templateName: string): string {
        return fs.readFileSync(__dirname + "/templates/" + templateName + ".html", { encoding: 'utf-8' })
    }

    toBatchMail(destinationEmailAddressed: string[]): BatchEmail {
        return {
            destinations: destinationEmailAddressed,
            subject: this.getSubject(),
            htmlContent: this.getRenderedContentHTML(),
            textContent: this.getTextContent(),
            retryCounter: this.MAX_BATCH_RETRY_COUNT,
            id: -1
        };
    }
}