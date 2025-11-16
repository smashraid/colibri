import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  DateAdapter,
} from '@angular/material/core';
import { CustomDateFnsAdapter } from '../adapters/date-fns-adapter'; // Adjust path if necessary

/**
 * Custom date-fns formats for Angular Material components.
 * This is based on standard 'en-US' locale formats.
 *
 * DD/MM/YYYY is often used for UK/European formatting.
 * For US: MM/dd/yyyy.
 */
export const MAT_DATE_FNS_FORMATS = {
  parse: {
    // The format the adapter uses to parse the user's input string.
    dateInput: 'MM/dd/yyyy',
  },
  display: {
    // The format used in the input field.
    dateInput: 'MM/dd/yyyy',
    // The format used for the month/year label in the calendar header.
    monthYearLabel: 'MMM yyyy',
    // The format used for the header label on the year view.
    dateA11yLabel: 'LL',
    // The format used for the header label on the month view.
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

/**
 * Array of providers to use in your application's root injector (or the component where the date picker lives).
 */
export const DATE_FNS_PROVIDERS = [
  {
    provide: DateAdapter,
    useClass: CustomDateFnsAdapter,
  },
  {
    // You can change the locale here if needed (e.g., 'es-ES' for Spanish)
    provide: MAT_DATE_LOCALE,
    useValue: 'en-US',
  },
  {
    provide: MAT_DATE_FORMATS,
    useValue: MAT_DATE_FNS_FORMATS,
  },
];
