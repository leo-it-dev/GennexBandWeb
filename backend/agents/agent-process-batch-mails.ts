import * as config from 'config';
import { getApiModule } from "..";
import { Agent } from "../modules/agent/agent";
import { AgentTrigger, AgentTrigger5M } from "../modules/agent/agent_trigger";
import { ApiModuleMailer } from '../modules/mailer/api_mailer';

export class AgentProcessBatchMails extends Agent {

    MAX_CONTACTS_PER_MAIL = config.get('mail.BATCH_MAX_CONTACTS_PER_MAIL_EVERY_5_MINUTES') as number;

    constructor() {
        super([
            AgentTrigger5M,
        ]);
    }

    name() {
        return "send-batch-email"
    }

    initialize() {

    }

    async triggeredBy(trigger: AgentTrigger) {
        let mailer = getApiModule(ApiModuleMailer);
        await mailer.popBatchEmailChunk(this.MAX_CONTACTS_PER_MAIL, async (batchMail) => {
            let rejectedMails = await mailer.sendEmail(batchMail);
            return rejectedMails;
        });
    }
}