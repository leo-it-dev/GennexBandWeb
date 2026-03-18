export interface InputStringVerifier {
    go(input: string): boolean;
}

export class VRequired implements InputStringVerifier {
    go(input: string): boolean {
        return input != undefined && input.length > 0;
    }
}

export class VMaxLength implements InputStringVerifier {
    maxLength: number = 0;

    constructor(maxLength: number) {
        this.maxLength = maxLength;
    }

    go(input: string): boolean {
        return input != undefined && input.length < this.maxLength;
    }
}

export class VEMailAddress implements InputStringVerifier {
    go(input: string): boolean {
        return input != undefined && /^\S+@\S+\.\S+$/.test(input);
    }
}

export type InputVerifierTemplateType = {
    fields: {
        [key: string]: {
            'default': string,
            'verifiers': InputStringVerifier[]
        }
    }
}

export class InputVerifierTemplate {

	private templateDefinition: InputVerifierTemplateType;

	constructor(template: InputVerifierTemplateType) {
		this.templateDefinition = template;
	}

	getTemplate(): InputVerifierTemplateType {
		return this.templateDefinition;
	}

	verify(unchecked: any): boolean {
		let template = this.templateDefinition;
		for (let fieldKey in template.fields) {
			let fieldExists = fieldKey in unchecked;

			if (!fieldExists) {
				return false;
			}

			let fieldVal = template.fields[fieldKey];

			let typeOK = (typeof unchecked[fieldKey]) == 'string';
			let verifiersOK = fieldVal.verifiers.map(v => v.go(unchecked[fieldKey])).every(Boolean)

			if (!typeOK || !verifiersOK) {
				return false;
			}
		}
		return true;
	}
}