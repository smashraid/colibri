import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { Inject, Injectable, Optional } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { enUS } from 'date-fns/locale';
import {
  compareAsc,
  isSameDay,
  // Ensure you only import what you are overriding or explicitly using
} from 'date-fns';

/**
 * Custom DateFnsAdapter to ensure all required methods are implemented and
 * utilize date-fns for robust date manipulation and comparison.
 */
@Injectable()
export class CustomDateFnsAdapter extends DateFnsAdapter {
  // CRITICAL: Inject the locale and pass it to the super constructor to resolve
  // the 'preprocessor' error and ensure date-fns is initialized correctly.
  constructor(@Optional() @Inject(MAT_DATE_LOCALE) matDateLocale: string) {
    // The base adapter needs the locale value (string or object) passed to it.
    super(matDateLocale);
  }

  // --- Date Comparison & Utility Methods (Keeping only necessary overrides) ---

  override compareDate(first: Date, second: Date): number {
    return compareAsc(first, second);
  }

  override sameDate(first: Date, second: Date): boolean {
    return isSameDay(first, second);
  }

  override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    if (style === 'long') {
      return [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
    }
    return super.getMonthNames(style);
  }

  override getDateNames(): string[] {
    return Array(31)
      .fill(0)
      .map((_, i) => String(i + 1));
  }

  override getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    if (style === 'long') {
      return [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
    }
    return super.getDayOfWeekNames(style);
  }

  override getFirstDayOfWeek(): number {
    // Default to Sunday (0) for US locale
    return 0;
  }
}
