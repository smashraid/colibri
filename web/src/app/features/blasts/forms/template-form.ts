import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CampaignListResponse } from '../../../core/models/api/response/campaign-list';
import { requireAutocompleteObject } from '../../../shared/validators/require-autocomplete-object';

export interface TemplateFormValue {
  iterableTemplateId: bigint | null;
  iterableListId: CampaignListResponse | null;
  iterableSupressionId: bigint | null;
}

export interface TemplateForm {
  iterableTemplateId: FormControl<bigint | null>;
  iterableListId: FormControl<CampaignListResponse | null>;
  iterableSupressionId: FormControl<bigint | null>;
}

export type TemplateFormControls = TemplateForm;

export const TEMPLATE_INITIAL_VALUES: TemplateFormValue = {
  iterableTemplateId: null,
  iterableListId: null,
  iterableSupressionId: null,
};

export function createTemplateForm(
  initialValues: Partial<TemplateFormValue> = {}
): FormGroup<TemplateForm> {
  return new FormGroup<TemplateForm>({
    iterableTemplateId: new FormControl(
      initialValues.iterableTemplateId ??
        TEMPLATE_INITIAL_VALUES.iterableTemplateId,
      {
        nonNullable: false,
        validators: [Validators.required],
      }
    ),
    iterableListId: new FormControl(
      initialValues.iterableListId ?? TEMPLATE_INITIAL_VALUES.iterableListId,
      {
        nonNullable: false,
        validators: [Validators.required, requireAutocompleteObject()],
      }
    ),
    iterableSupressionId: new FormControl(
      initialValues.iterableSupressionId ??
        TEMPLATE_INITIAL_VALUES.iterableSupressionId
    ),
  });
}

export function resetTemplateForm(
  form: FormGroup<TemplateForm>,
  values: Partial<TemplateFormValue> = {}
): void {
  form.reset({
    ...TEMPLATE_INITIAL_VALUES,
    ...values,
  });
}
