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

export function createTemplateForm(
  initialValues: Partial<TemplateFormValue> = {}
): FormGroup<TemplateForm> {
  return new FormGroup<TemplateForm>({
    iterableTemplateId: new FormControl(
      initialValues.iterableTemplateId ?? null,
      {
        nonNullable: false,
        validators: [Validators.required],
      }
    ),
    iterableListId: new FormControl(initialValues.iterableListId ?? null, {
      nonNullable: false,
      validators: [Validators.required, requireAutocompleteObject()],
    }),
    iterableSupressionId: new FormControl(
      initialValues.iterableSupressionId ?? null
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

export const TEMPLATE_INITIAL_VALUES: TemplateFormValue = {
  iterableTemplateId: null,
  iterableListId: null,
  iterableSupressionId: null,
};
