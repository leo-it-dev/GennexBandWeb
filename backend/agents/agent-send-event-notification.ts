import * as config from 'config';
import { getApiModule } from "..";
import { MailNewEventMessage } from "../email/event-new-message";
import { Agent } from "../modules/agent/agent";
import { AgentTrigger, AgentTriggerCalendarCreate, AgentTriggerCalendarDelete, AgentTriggerCalendarModify } from "../modules/agent/agent_trigger";
import { ApiModuleCalendar, CalendarEntryChangeToken } from "../modules/calendar/api_calendar";
import { ApiModuleMailer } from '../modules/mailer/api_mailer';
import { MailModifiedEventMessage } from '../email/event-modified-message';
import { MailDeletedEventMessage } from '../email/event-deleted-message';

export class AgentSendCalendarEntryNotification extends Agent {

    SMTP_USERNAME = config.get("mail.SMTP_USERNAME") as string;

    constructor() {
        super([
            AgentTriggerCalendarCreate,
            AgentTriggerCalendarDelete,
            AgentTriggerCalendarModify,
        ]);
    }

    name() {
        return "send-calendar-entry-notifiations-mail"
    }

    initialize() {

    }

    async triggeredBy(trigger: AgentTrigger) {
        let mailer = getApiModule(ApiModuleMailer);
        let calendar = getApiModule(ApiModuleCalendar);
        if (trigger instanceof AgentTriggerCalendarCreate) {
            for (let entry of trigger.calendarEntries) {
                let publishEventUrl = calendar.generatePublishNewEventUrl(entry);
                let publicEventURL = calendar.getEventURL(entry);
                let newEventMail = new MailNewEventMessage(entry, publishEventUrl, undefined, publicEventURL);
                await mailer.sendEmailImmediately(newEventMail.toBatchMail([this.SMTP_USERNAME]));
            }
        }
        if (trigger instanceof AgentTriggerCalendarModify) {
            for (let entry of trigger.calendarEntries) {
                let change: CalendarEntryChangeToken = {
                    oldDate: (entry.old.date.getTime() != entry.new.date.getTime()) ? entry.old.date.getTime() : undefined,
                    oldTitle: entry.old.title != entry.new.title ? entry.old.title : undefined,
                    oldDescription: entry.old.description != entry.new.description ? entry.old.description : undefined,
                    oldLocation: entry.old.locationString != entry.new.locationString ? entry.old.locationString : undefined
                };

                if (Object.values(change).find(o => o != undefined)) {
                    let publishEventUrl = calendar.generatePublishModifyEvent(change, entry.new);
                    let publicEventURL = calendar.getEventURL(entry.new);
                    let modifiedEventMail = new MailModifiedEventMessage(entry.new, change, publishEventUrl, undefined, publicEventURL);
                    await mailer.sendEmailImmediately(modifiedEventMail.toBatchMail([this.SMTP_USERNAME]))
                }

                // entry.new.attachments
            }
        }
        if (trigger instanceof AgentTriggerCalendarDelete) {
            for (let entry of trigger.calendarEntries) {
                let publishEventUrl = calendar.generatePublishDeleteEventUrl(entry);
                let delEventMail = new MailDeletedEventMessage(entry, publishEventUrl, undefined);
                await mailer.sendEmailImmediately(delEventMail.toBatchMail([this.SMTP_USERNAME]));
            }
        }
    }
}