// Path to your custom validator file

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function requireAutocompleteObject(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    // Let the standard Validators.required handle null/undefined/empty string
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // 🔴 If the value is a string, it means the user typed something but didn't select the object.
    if (typeof value === 'string') {
      return { requiredObject: true };
    }

    // If it's an object, a selection was made, and it's valid.
    return null;
  };
}
