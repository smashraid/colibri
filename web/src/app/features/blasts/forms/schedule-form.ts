import { FormControl, FormGroup, Validators } from '@angular/forms';

export interface ScheduleFormValue {
  name: string;
  tags: string[] | null;
  intervalTime: number | null;
  sendAtDate: Date | null;
  sendAtTime: Date | null;
}

export interface ScheduleForm {
  name: FormControl<string>;
  tags: FormControl<string[] | null>;
  intervalTime: FormControl<number | null>;
  sendAtDate: FormControl<Date | null>;
  sendAtTime: FormControl<Date | null>;
}

export type ScheduleFormControls = ScheduleForm;

export const SCHEDULE_INITIAL_VALUES: ScheduleFormValue = {
  name: '',
  tags: null,
  intervalTime: null,
  sendAtDate: null,
  sendAtTime: null,
};

export function createScheduleForm(
  initialValues: Partial<ScheduleFormValue> = {}
): FormGroup<ScheduleForm> {
  return new FormGroup<ScheduleForm>({
    name: new FormControl(initialValues.name ?? SCHEDULE_INITIAL_VALUES.name, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tags: new FormControl(initialValues.tags ?? SCHEDULE_INITIAL_VALUES.tags),
    intervalTime: new FormControl(
      initialValues.intervalTime ?? SCHEDULE_INITIAL_VALUES.intervalTime,
      {
        nonNullable: false,
        validators: [Validators.required],
      }
    ),
    sendAtDate: new FormControl(
      initialValues.sendAtDate ?? SCHEDULE_INITIAL_VALUES.sendAtDate,
      {
        nonNullable: true,
        validators: [Validators.required],
      }
    ),
    sendAtTime: new FormControl(
      initialValues.sendAtTime ?? SCHEDULE_INITIAL_VALUES.sendAtTime,
      {
        nonNullable: true,
        validators: [Validators.required],
      }
    ),
  });
}

export function resetScheduleForm(
  form: FormGroup<ScheduleForm>,
  values: Partial<ScheduleFormValue> = {}
): void {
  form.reset({
    ...SCHEDULE_INITIAL_VALUES,
    ...values,
  });
}
