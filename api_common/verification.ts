import { InputVerifierTemplate, InputVerifierTemplateType, VEMailAddress, VMaxLength, VRequired } from "./verifier";

export const MAX_TTL_MINUTES = 15;
export const VERIFICATION_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const VERIFICATION_CODE_LENGTH = 6;

export let contactFormularRequestVerification = new InputVerifierTemplate({
	fields: {
		'firstName': { 'default': "", verifiers: [new VRequired(), new VMaxLength(30)] },
		'surName': { 'default': "", verifiers: [new VRequired(), new VMaxLength(30)] },
		'email': { 'default': "", verifiers: [new VRequired(), new VMaxLength(200), new VEMailAddress()] },
		'message': { 'default': "", verifiers: [new VRequired(), new VMaxLength(2000)] },
		'captcha': { 'default': "", verifiers: [new VRequired(), new VMaxLength(4000)] },
	}
});

export let subscribeFormularRequestVerification = new InputVerifierTemplate({
	fields: {
		'email': { 'default': "", verifiers: [new VRequired(), new VMaxLength(200), new VEMailAddress()] },
		'captcha': { 'default': "", verifiers: [new VRequired(), new VMaxLength(4000)] },
	}
});

export let unsubscribeFormularRequestVerification = new InputVerifierTemplate({
	fields: {
		'token': { 'default': "", verifiers: [new VRequired(), new VMaxLength(2000)] },
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





export enum SubscribeFormularResponse {
	SUCCESS,
	ALREADY_REGISTERED,
	EMAIL_VERIFICATION_REQUIRED,
	EMAIL_VERIFICATION_CODE_INVALID,
	CAPTCHA_INVALID,
	UNKNOWN_ERROR
}

export enum SubscribeFormularStatusCodes {
	MESSAGE_SENT = 200,
	ALREADY_REGISTERED = 201,
	MALFORMED_REQUEST = 400,
	EMAIL_VERIFICATION_REQUIRED = 401,
	CAPTCHA_INVALID = 403,
	EMAIL_VERIFICATION_CODE_INVALID = 404,
	INTERNAL_SERVER_ERROR = 500
}


export enum UnsubscribeFormularResponse {
	SUCCESS,
	UNKNOWN_ERROR,
	TOKEN_INVALID,
	ACCOUNT_UNKNOWN
}

export enum UnsubscribeFormularStatusCodes {
	UNSUBSCRIBE_SUCCESS = 200,
	INTERNAL_SERVER_ERROR = 500,
	MALFORMED_REQUEST = 400,
	ACCOUNT_NOT_FOUND = 401,
	TOKEN_INVALID = 403
}