import { Agent } from "../modules/agent/agent";
import { AgentTrigger, AgentTriggerCalendarCreate, AgentTriggerCalendarDelete, AgentTriggerCalendarModify } from "../modules/agent/agent_trigger";
import * as mailer from '../mailer';
import * as config from 'config';
import { MailNewEventMessage } from "../email/event-new-message";

export class AgentSendEventNotification extends Agent {

    constructor() {
        super([
            AgentTriggerCalendarCreate,
            AgentTriggerCalendarDelete,
            AgentTriggerCalendarModify,
        ]);
    }

    name() {
        return "send-event-notifiations-mail"
    }
    
    initialize() {
    }

    triggeredBy(trigger: AgentTrigger) {
        if (trigger instanceof AgentTriggerCalendarCreate) {
            for(let entry of trigger.calendarEntries) {
                let newEventMail = new MailNewEventMessage(entry, "bla");
                mailer.sendEmail([config.get('mail.SMTP_USERNAME')], newEventMail);
            }
        }
    }
}