import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { Injectable, inject } from '@angular/core';
import {
  compareAsc,
  isSameDay,
  isSameMonth,
  isSameYear,
  parse,
  format,
} from 'date-fns';

@Injectable()
export class CustomDateFnsAdapter extends DateFnsAdapter {
  // ... (All required override methods from the previous answer) ...

  override compareDate(first: Date, second: Date): number {
    return compareAsc(first, second);
  }

  override sameDate(first: Date, second: Date): boolean {
    return isSameDay(first, second);
  }

  // --- Localization Methods (Required for DateAdapter) ---
  // If you are extending DateFnsAdapter, many of these methods might
  // be inherited, but it is safer to implement the abstract ones explicitly
  // or confirm they are handled by the base class.

  override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    // Implementation logic...
    return []; // Placeholder
  }

  override getDateNames(): string[] {
    // Implementation logic...
    return []; // Placeholder
  }

  override getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    // Implementation logic...
    return []; // Placeholder
  }

  override getFirstDayOfWeek(): number {
    return 1;
  }

  override toIso8601(date: Date): string {
    return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  override format(date: Date, displayFormat: any): string {
    return format(date, displayFormat);
  }

  override parse(value: any, parseFormat: any): Date | null {
    if (typeof value === 'string') {
      const date = parse(value, parseFormat, new Date());
      return isNaN(date.getTime()) ? null : date;
    }
    return value ? new Date(value) : null;
  }
}
