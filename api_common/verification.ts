import { InputVerifierTemplate, InputVerifierTemplateType, VMaxLength, VRequired } from "./verifier";

export const MAX_TTL_MINUTES = 15;
export const VERIFICATION_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const VERIFICATION_CODE_LENGTH = 6;

export type ContactFormularRequest = {
	firstName: string,
	surName: string,
	email: string,
	message: string,
	captcha: string,
	mailVerificationCode: string
};

export let contactFormularRequestVerification = new InputVerifierTemplate({
	fields: {
		'firstName': { 'default': "", verifiers: [new VRequired(), new VMaxLength(30)] },
		'surName': { 'default': "", verifiers: [new VRequired(), new VMaxLength(30)] },
		'email': { 'default': "", verifiers: [new VRequired(), new VMaxLength(60)] },
		'message': { 'default': "", verifiers: [new VRequired(), new VMaxLength(2000)] },
		'captcha': { 'default': "", verifiers: [new VRequired(), new VMaxLength(4000)] },
	}
});

export enum ContactFormularResponse {
	SUCCESS,
	EMAIL_VERIFICATION_REQUIRED,
	EMAIL_VERIFICATION_CODE_INVALID,
	CAPTCHA_INVALID,
	UNKNOWN_ERROR
}

export enum ContactFormularStatusCodes {
	MESSAGE_SENT = 200,
	MALFORMED_REQUEST = 400,
	EMAIL_VERIFICATION_REQUIRED = 401,
	CAPTCHA_INVALID = 403,
	EMAIL_VERIFICATION_CODE_INVALID = 404,
	INTERNAL_SERVER_ERROR = 500
}