const nodemailer = require("nodemailer");
import * as config from 'config';
import { MailTemplate } from './email/mail-template';

// Create a transporter using Ethereal test credentials.
// For production, replace with your actual SMTP server details.
const transporter = nodemailer.createTransport({
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

// Send an email using async/await
export async function sendEmail(destinationAddress: string[], mail: MailTemplate) {
	console.log("Try to send mail:", destinationAddress, mail.getSubject(), mail.getTextContent(), mail.getHtmlContent());

	const info = await transporter.sendMail({
		from: config.get('mail.MAIL_FROM_HEADER'),
		to: destinationAddress.join(', '),
		subject: mail.getSubject(),
		text: mail.getTextContent(), // Plain-text version of the message
		html: mail.getHtmlContent(), // HTML version of the message
	});
	console.log("Message sent:", info.messageId);
}
