import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  DateAdapter,
  MatDateFormats,
} from '@angular/material/core';
import { enUS } from 'date-fns/locale';
import { CustomDateFnsAdapter } from '../adapters/date-fns-adapter';

/**
 * Custom date-fns formats for Angular Material components.
 * This is configured for standard US formatting (MM/dd/yyyy).
 */
export const MAT_DATE_FNS_FORMATS: MatDateFormats = {
  parse: {
    // The format the adapter uses to parse the user's input string.
    dateInput: 'MM/dd/yyyy',
    timeInput: 'HH:mm',
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

    // CRITICAL FIX: Changed 'h:mm A' (Moment token) to 'h:mm a' (date-fns token)
    timeInput: 'h:mm a',
    timeOptionLabel: 'h:mm a', // Format for displaying time in the time picker options
  },
};

/**
 * Array of providers to use in your application's root injector.
 */
export const DATE_FNS_PROVIDERS = [
  // 1. Provide the Custom Adapter
  {
    provide: DateAdapter,
    useClass: CustomDateFnsAdapter,
  },
  // 2. Provide the Formats
  {
    provide: MAT_DATE_FORMATS,
    useValue: MAT_DATE_FNS_FORMATS,
  },
  // 3. Provide the Locale (Crucial for date-fns internals, avoiding the 'preprocessor' error)
  {
    provide: MAT_DATE_LOCALE,
    useValue: enUS, // Provide the actual date-fns locale object
  },
];
