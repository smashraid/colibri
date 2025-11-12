import { FormControl, FormGroup, Validators } from '@angular/forms';
import moment from 'moment';

export interface ScheduleFormValue {
  name: string;
  tags: string[] | null;
  intervalTime: number | null;
  sendAt: moment.Moment | null;
}

export interface ScheduleForm {
  name: FormControl<string>;
  tags: FormControl<string[] | null>;
  intervalTime: FormControl<number | null>;
  sendAt: FormControl<moment.Moment | null>;
}

export function createScheduleForm(
  initialValues: Partial<ScheduleFormValue> = {}
): FormGroup<ScheduleForm> {
  return new FormGroup<ScheduleForm>({
    name: new FormControl(initialValues.name ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tags: new FormControl(initialValues.tags ?? null),
    intervalTime: new FormControl(initialValues.intervalTime ?? null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
    sendAt: new FormControl(initialValues.sendAt ?? null, {
      nonNullable: true,
      validators: [Validators.required],
    }),
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

export const SCHEDULE_INITIAL_VALUES: ScheduleFormValue = {
  name: '',
  tags: null,
  intervalTime: null,
  sendAt: null,
};
