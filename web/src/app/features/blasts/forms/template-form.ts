import { FormControl, FormGroup, Validators } from '@angular/forms';

export interface TemplateFormValue {
  iterableTemplateId: number | null;
  iterableListId: number | null;
  iterableSupressionId: number | null;
}

export interface TemplateForm {
  iterableTemplateId: FormControl<number | null>;
  iterableListId: FormControl<number | null>;
  iterableSupressionId: FormControl<number | null>;
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
      validators: [Validators.required],
    }),
    iterableSupressionId: new FormControl(
      initialValues.iterableSupressionId ?? null,
      {
        nonNullable: false,
        validators: [Validators.required],
      }
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
