import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import moment from 'moment';

export function maxCampaignDays(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const batchSize: number | null = control.get('batchSize')?.value;
    const intervalTime: number | null = control.get('interval')?.value;
    const totalCount: number | null = control.get('totalCount')?.value;
    const sendDate: moment.Moment = control.get('sendDate')?.value;
    const today = moment();
    const daysDiff = sendDate.diff(today, 'days');

    const MAX_VALUE = 30240;
    const MAX_DAYS_PERMIT = 21;

    if (batchSize && intervalTime && totalCount) {
      const increasedTime = Math.ceil(totalCount / batchSize) * intervalTime;
      const validateMaxDays = increasedTime >= MAX_VALUE;
      return validateMaxDays ? { maxCampaignDaysError: true } : null;
    } else if (daysDiff >= MAX_DAYS_PERMIT) {
      return { maxCampaignDaysError: true };
    }
    return null;
  };
}
