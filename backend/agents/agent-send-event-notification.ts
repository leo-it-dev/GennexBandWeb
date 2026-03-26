import * as config from 'config';
import { getApiModule } from "..";
import { MailNewEventMessage } from "../email/event-new-message";
import { Agent } from "../modules/agent/agent";
import { AgentTrigger, AgentTriggerCalendarCreate, AgentTriggerCalendarDelete, AgentTriggerCalendarModify } from "../modules/agent/agent_trigger";
import { ApiModuleCalendar } from "../modules/calendar/api_calendar";
import { ApiModuleMailer } from '../modules/mailer/api_mailer';

export class AgentSendCalendarEntryNotification extends Agent {

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
        if (trigger instanceof AgentTriggerCalendarCreate) {
            for (let entry of trigger.calendarEntries) {
                let publishEventUrl = getApiModule(ApiModuleCalendar).generatePublishEventUrl(entry);
                let newEventMail = new MailNewEventMessage(entry, publishEventUrl, true, undefined);
                await mailer.sendEmailImmediately(newEventMail.toBatchMail([config.get('mail.SMTP_USERNAME')]));
            }
        }
    }
}