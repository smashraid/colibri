import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function selecteValidOption(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (typeof control.value === 'string') {
      return { invalidAutocomplete: { value: control.value } };
    }
    return null;
  };
}
