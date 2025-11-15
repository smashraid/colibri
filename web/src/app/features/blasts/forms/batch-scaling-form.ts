import { FormControl, FormGroup, Validators } from '@angular/forms';

// Form value interface (useful for API calls)
export interface BatchScalingFormValue {
  batchSize: number | null;
  initialListSize: number | null;
  growthPercentage: number | null;
  batchType: number | null;
}

// Form controls interface
export interface BatchScalingForm {
  batchSize: FormControl<number | null>;
  initialListSize: FormControl<number | null>;
  growthPercentage: FormControl<number | null>;
  batchType: FormControl<number | null>;
}

export type BatchScalingFormControls = BatchScalingForm;

// Initial values
export const BATCH_SCALING_INITIAL_VALUES: BatchScalingFormValue = {
  batchSize: null,
  initialListSize: null,
  growthPercentage: null,
  batchType: 1, // Defaulting to 1 (Batch Size)
};

// Factory function with options
export function createBatchScalingForm(
  initialValues: Partial<BatchScalingFormValue> = {}
): FormGroup<BatchScalingForm> {
  return new FormGroup<BatchScalingForm>({
    batchType: new FormControl(
      initialValues.batchType ?? BATCH_SCALING_INITIAL_VALUES.batchType,
      {
        nonNullable: false,
        validators: [Validators.required],
      }
    ),
    batchSize: new FormControl(
      initialValues.batchSize ?? BATCH_SCALING_INITIAL_VALUES.batchSize
    ),
    initialListSize: new FormControl(
      initialValues.initialListSize ??
        BATCH_SCALING_INITIAL_VALUES.initialListSize
    ),
    growthPercentage: new FormControl(
      initialValues.growthPercentage ??
        BATCH_SCALING_INITIAL_VALUES.growthPercentage
    ),
  });
}

/**
 * Dynamically updates the validators and enabled/disabled state of the batch scaling
 * form controls based on the selected batchType (1 or 2).
 * @param form The BatchScalingForm group.
 */
export function updateBatchScalingValidation(
  form: FormGroup<BatchScalingForm>
): void {
  const controls = form.controls;
  const batchType = controls.batchType.value;

  // 1. Clear all dynamic validations
  controls.batchSize.clearValidators();
  controls.initialListSize.clearValidators();
  controls.growthPercentage.clearValidators();

  // 2. Clear values for controls that are about to be disabled
  controls.batchSize.setValue(null);
  controls.initialListSize.setValue(null);
  controls.growthPercentage.setValue(null);

  // 3. Mark controls as pristine and untouched to clear any previous validation error displays (THE FIX)
  controls.batchSize.markAsUntouched();
  controls.batchSize.markAsPristine();
  controls.initialListSize.markAsUntouched();
  controls.initialListSize.markAsPristine();
  controls.growthPercentage.markAsUntouched();
  controls.growthPercentage.markAsPristine();

  // 4. Reset enable/disable state
  controls.batchSize.disable();
  controls.initialListSize.disable();
  controls.growthPercentage.disable();

  if (batchType === 1) {
    // Case 1: Batch Size (Required field: batchSize)
    controls.batchSize.setValidators([Validators.required]);
    controls.batchSize.enable();
  } else if (batchType === 2) {
    // Case 2: Batch Growth (Required fields: initialListSize, growthPercentage)
    controls.initialListSize.setValidators([Validators.required]);
    controls.growthPercentage.setValidators([Validators.required]);
    controls.initialListSize.enable();
    controls.growthPercentage.enable();
  }

  // 5. Recalculate validity for all affected controls
  controls.batchSize.updateValueAndValidity();
  controls.initialListSize.updateValueAndValidity();
  controls.growthPercentage.updateValueAndValidity();

  // Recalculate validity for the parent form group
  form.updateValueAndValidity();
}

// Reset helper
export function resetBatchScalingForm(form: FormGroup<BatchScalingForm>): void {
  form.reset({
    ...BATCH_SCALING_INITIAL_VALUES,
  });
  // After reset, apply initial validation setup
  updateBatchScalingValidation(form);
}
