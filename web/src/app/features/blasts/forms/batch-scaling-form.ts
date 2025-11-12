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

// Factory function with options
export function createBatchScalingForm(
  initialValues: Partial<BatchScalingFormValue> = {}
): FormGroup<BatchScalingForm> {
  return new FormGroup<BatchScalingForm>({
    batchType: new FormControl(initialValues.batchType ?? null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
    batchSize: new FormControl(initialValues.batchSize ?? null),
    initialListSize: new FormControl(initialValues.initialListSize ?? null),
    growthPercentage: new FormControl(initialValues.growthPercentage ?? null),
  });
}

// Reset helper
export function resetBatchScalingForm(
  form: FormGroup<BatchScalingForm>,
  values: Partial<BatchScalingFormValue> = {}
): void {
  form.reset({
    ...BATCH_SCALING_INITIAL_VALUES,
    ...values,
  });
}

// Initial values
export const BATCH_SCALING_INITIAL_VALUES: BatchScalingFormValue = {
  batchType: null,
  batchSize: null,
  initialListSize: null,
  growthPercentage: null,
};
