/**
 * This api implements a "at-least-once" message queue, that ensures
 * - atomatic claiming of email chunks from the database
 * - retries for failed message transmissions (general errors as well as handling transmission errors on a subset of recipients)
 * - transactional based deletion / retry-insertion mechanism when writing new state to the database
 * 
 * !!! ONE important caveat !!!
 * This implements "at-least-once", meaning if the service crashes after sending a batch of mails but before completing the transaction
 *  after a service restart the recipients of the current batch will receive the email twice.
 * Not a problem, just a bit annoying.
 * 
 * May be refined in the future to represent a 'exactly-once' message queue.
 */

import * as config from 'config';
import * as nodemailer from 'nodemailer';
import { ApiModule } from "../../api_module";
import { SqlUpdate } from "../../framework/sqlite_database";
import { timeout } from '../../framework/timeout';

export type BatchEmail = {
    destinations: string[],
    subject: string,
    textContent: string,
    htmlContent: string,
    retryCounter: number,
    id: number
}

export class ApiModuleMailer extends ApiModule {

    transporter?: nodemailer.Transporter;
    BATCH_MAIL_DELAY_BETWEEN_SMTP_SENDS_SECONDS = config.get('mail.BATCH_MAIL_DELAY_BETWEEN_SMTP_SENDS_SECONDS') as number;

    private dbStoreBatchEmail(mail: BatchEmail) {
        this.sqlite().sqlUpdate({
            params: [JSON.stringify(mail.destinations), mail.subject, mail.textContent, mail.htmlContent, mail.retryCounter],
            update: "INSERT INTO batch(destinations,subject,textContent,htmlContent,retryCounter) VALUES (?, ?, ?, ?, ?)"
        });
    }

    getTransporter(): nodemailer.Transporter {
        if (this.transporter) {
            return this.transporter;
        }
        throw new Error("Error reading mailer transporter as it is not initialized yet!");
    }

    private dbAcquireFirstBatchEmail(): BatchEmail | undefined {
        let mailEntry = this.sqlite().sqlFetchFirst(
            "UPDATE batch SET isProcessing = 1 \
            WHERE ID IN (\
                SELECT ID FROM batch \
                WHERE isProcessing = 0 \
                ORDER BY ID ASC \
                LIMIT 1\
            ) \
            RETURNING *",
            []);

        if (!mailEntry) {
            return undefined;
        }

        let mail: BatchEmail = {
            id: mailEntry["ID"],
            destinations: JSON.parse(mailEntry["destinations"]) as string[],
            htmlContent: mailEntry["htmlContent"],
            textContent: mailEntry["textContent"],
            retryCounter: mailEntry["retryCounter"],
            subject: mailEntry["subject"]
        };
        return mail;
    }

    private dbUpdateBatchEmailRecipientsOrDelete(emailID: number, destinationAddresses: string[]) {
        if (destinationAddresses.length == 0) {
            this.sqlite().sqlUpdate({
                params: [emailID],
                update: "DELETE FROM batch WHERE ID=?"
            });
        } else {
            this.sqlite().sqlUpdate({
                params: [JSON.stringify(destinationAddresses), emailID],
                update: "UPDATE batch SET destinations=? WHERE ID=?"
            });
        }
    }

    modname(): string {
        return "mailer";
    }

    initialize() {
        // Create a transporter using Ethereal test credentials.
        // For production, replace with your actual SMTP server details.
        this.transporter = nodemailer.createTransport({
            host: config.get("mail.HOSTNAME_SMTP"),
            port: config.get("mail.PORT_SMTP"),
            secure: config.get("mail.SMTP_USE_SSL"),
            auth: {
                user: config.get("mail.SMTP_USERNAME"),
                pass: config.get("mail.SMTP_PASSWORD"),
            }
            // ,logger: true,
            // cdebug: true
        });

        // if this app crashes we may have entries left in our database that have their isProcessing marker set.
        // those would never be processed again. Therefore once this app restarts reset all isProcessing markers.
        this.sqlite().sqlUpdate({ update: "UPDATE batch SET isProcessing=0", params: [] });
    }

    protected sqliteTableCreate(): SqlUpdate[] | undefined {
        return [{
            params: [],
            update: "CREATE TABLE IF NOT EXISTS batch (\
                        ID INTEGER PRIMARY KEY AUTOINCREMENT,\
                        destinations TEXT NOT NULL, \
                        subject TEXT NOT NULL, \
                        textContent TEXT NOT NULL, \
                        htmlContent TEXT NOT NULL, \
                        retryCounter INTEGER DEFAULT 0, \
                        isProcessing BOOL DEFAULT 0\
                    \)"
        }];
    }

    registerEndpoints(): void {

    }

    // ID in batchMail does not matter, as we push a new batch of mails into the database (even though it might be a subset of the previous batch if reception failed for some addressed.)
    public async queueBatchEmail(batchMail: BatchEmail) {
        this.dbStoreBatchEmail(batchMail);
        this.logger().info("Queued batch mail!", { recipientCount: batchMail.destinations.length, subject: batchMail.subject, retryCount: batchMail.retryCounter })
    }

    public async popBatchEmailChunk(maxContacts: number, callback: (batchMail: BatchEmail) => Promise<string[]>): Promise<void> {
        let sentContacts = 0;
        let queuedBatchMail: BatchEmail | undefined = undefined;

        // pop the first batch email
        while (sentContacts < maxContacts && (queuedBatchMail = this.dbAcquireFirstBatchEmail()) != undefined) {
            let queuedBatchMailLoc = queuedBatchMail;

            if (sentContacts > 0) {
                await timeout(this.BATCH_MAIL_DELAY_BETWEEN_SMTP_SENDS_SECONDS * 1000);
            }

            // select the first 'maxContacts' email addresses as targets for this email send batch.
            let contactSubset = queuedBatchMail.destinations.slice(0, Math.min(maxContacts, queuedBatchMail.destinations.length))

            // prepare our batch email
            let batchMail: BatchEmail = {
                id: queuedBatchMail.id,
                destinations: contactSubset,
                htmlContent: queuedBatchMail.htmlContent,
                textContent: queuedBatchMail.textContent,
                subject: queuedBatchMail.subject,
                retryCounter: queuedBatchMail.retryCounter
            };

            let rejectedAddresses = await callback(batchMail);

            // we need to prevent data loss in case of a crash between 
            // 'deletion of processed mails' && 'reinserting rejected emails'
            this.sqlite().runTransaction(() => {
                // if there are still contacts left we need to send the mail to go ahead and throw that email back into our batch buffer
                // but only add those recipients that are not part of this batch's target email addresses.
                let allReceipientsSet = new Set(batchMail.destinations); // Using set as performance optimization (hash lookup)
                let remainingRecipients = queuedBatchMailLoc.destinations.filter(email => !allReceipientsSet.has(email));
                this.dbUpdateBatchEmailRecipientsOrDelete(queuedBatchMailLoc.id, remainingRecipients);

                if (rejectedAddresses.length > 0) {
                    if (batchMail.retryCounter > 1) {
                        let batchMailRetry = {
                            destinations: rejectedAddresses,
                            htmlContent: batchMail.htmlContent,
                            textContent: batchMail.textContent,
                            retryCounter: batchMail.retryCounter - 1,
                            subject: batchMail.subject,
                            id: -1,
                        };
                        this.dbStoreBatchEmail(batchMailRetry);
                        this.logger().info("Queued retry of batch mail subset!", { recipientCount: batchMailRetry.destinations.length, subject: batchMailRetry.subject, retryCount: batchMailRetry.retryCounter })
                    } else {
                        this.logger().warn("Deleting batch mail after exceeding max retry count!", { recipients: batchMail.destinations, subject: batchMail.subject })
                    }
                }
            });
            sentContacts += contactSubset.length;
        }
    }

    // promise return an array of email addresses that did NOT accept the email.
    async sendEmailImmediately(mail: BatchEmail): Promise<string[]> {
        this.logger().info("Trying to send mail!", { destinationCount: mail.destinations.length, subject: mail.subject })

        try {
            const info = await this.getTransporter().sendMail({
                from: config.get('mail.MAIL_FROM_HEADER'),
                to: mail.destinations.join(', '),
                subject: mail.subject,
                text: mail.textContent, // Plain-text version of the message
                html: mail.htmlContent, // HTML version of the message
            });
            this.logger().info("Message sent!", { destinationCount: mail.destinations.length, subject: mail.subject, messageId: info.messageId });
            return info.rejected as string[];
        } catch (error) {
            this.logger().error("Error sending message!", { destinationCount: mail.destinations.length, subject: mail.subject, error: error });
            return mail.destinations;
        }
    }
}
