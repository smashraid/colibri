import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import moment from 'moment';

export function maxCampaignDays(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const batchSize: number | null = control.get('batchSize')?.value;
    const intervalTime: number | null = control.get('interval')?.value;
    const totalCount: number | null = control.get('totalCount')?.value;
    const MAX_VALUE = 30240;

    if (batchSize && intervalTime && totalCount) {
      const increasedTime = Math.ceil(totalCount / batchSize) * intervalTime;
      const validateMaxDays = increasedTime >= MAX_VALUE;
      return validateMaxDays ? { maxCampaignDaysError: true } : null;
    }
    return null;
  };
}
