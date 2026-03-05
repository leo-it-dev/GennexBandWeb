import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { VMaxLength, VRequired, InputVerifierTemplate } from '../../../api_common/verifier';

export function formBuilderGroupFromInputVerifierTemplate(formBuilder: FormBuilder, verifierTemplate: InputVerifierTemplate): FormGroup {
    let fields: { [key:string]:any } = {};
    let templateDef = verifierTemplate.getTemplate();

    for (const fieldTemplateKey in templateDef.fields) {
        const fieldTemplateValue = templateDef.fields[fieldTemplateKey];
        let fieldValidatorsSync = [];

        for(let validator of fieldTemplateValue.verifiers) {
            if (validator instanceof VRequired) {
                fieldValidatorsSync.push( Validators.required );
            } else if (validator instanceof VMaxLength) {
                fieldValidatorsSync.push( Validators.maxLength(validator.maxLength) )
            } else {
                throw Error("Tried to convert InputVerifierTemplate to formBuilder group but this verifier is not yet implemented in frontend: " + (typeof validator) + "!");
            }
        }
        fields[fieldTemplateKey] = [fieldTemplateValue.default, fieldValidatorsSync];
    }
    return formBuilder.group(fields);
}