import { AbstractControl, ValidatorFn } from '@angular/forms';

/**
 * Time format utility functions
 */

// Validator
export function timeFormatValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;

    if (!value || value.trim() === '') {
      return null;
    }

    const validationResult = validateTimeFormat(value);

    if (!validationResult.isValid) {
      return {
        invalidTimeFormat: {
          value: value,
          message: validationResult.message,
        },
      };
    }

    return null;
  };
}

// Validation helper
export function validateTimeFormat(timeString: string): {
  isValid: boolean;
  message?: string;
} {
  const trimmedValue = timeString.trim().toLowerCase();

  // Accept decimal format
  if (/^-?\d*\.?\d+$/.test(trimmedValue)) {
    return { isValid: true };
  }

  // Must contain time elements
  if (!/[dhm]/.test(trimmedValue)) {
    return {
      isValid: false,
      message:
        'Time format must include d (days), h (hours), or m (minutes). Examples: 1h 30m, 2d 5h, 45m',
    };
  }

  // Validate structure
  const timeFormatRegex = /^(\d+\s*d)?\s*(\d+\s*h)?\s*(\d+\s*m)?\s*$/i;
  if (!timeFormatRegex.test(trimmedValue)) {
    return {
      isValid: false,
      message: 'Invalid time format. Use format like: 1d 2h 30m, 2h 45m, 30m',
    };
  }

  // Validate individual components
  const dayMatch = trimmedValue.match(/(\d+)\s*d/);
  const hourMatch = trimmedValue.match(/(\d+)\s*h/);
  const minuteMatch = trimmedValue.match(/(\d+)\s*m/);

  if (dayMatch && isNaN(parseInt(dayMatch[1]))) {
    return { isValid: false, message: 'Invalid day value' };
  }

  if (hourMatch && isNaN(parseInt(hourMatch[1]))) {
    return { isValid: false, message: 'Invalid hour value' };
  }

  if (minuteMatch && isNaN(parseInt(minuteMatch[1]))) {
    return { isValid: false, message: 'Invalid minute value' };
  }

  return { isValid: true };
}

// Conversion function
export function timeFormatToMinutes(timeString: string): number | null {
  if (!timeString || timeString.trim() === '') {
    return 0;
  }

  const validation = validateTimeFormat(timeString);
  if (!validation.isValid) {
    return null;
  }

  const trimmedValue = timeString.trim().toLowerCase();

  // Handle decimal input
  if (/^-?\d*\.?\d+$/.test(trimmedValue)) {
    return Math.round(parseFloat(trimmedValue) * 60);
  }

  // Parse time format
  let totalMinutes = 0;

  const dayMatch = trimmedValue.match(/(\d+)\s*d/);
  const hourMatch = trimmedValue.match(/(\d+)\s*h/);
  const minuteMatch = trimmedValue.match(/(\d+)\s*m/);

  if (dayMatch) {
    totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
  }

  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }

  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }

  return totalMinutes;
}

// Helper to normalize time format (for the directive)
export function normalizeTimeFormat(timeString: string): string {
  if (!timeString || timeString.trim() === '') {
    return '';
  }

  const trimmedValue = timeString.trim().toLowerCase();

  // If it's decimal, convert to time format
  if (/^-?\d*\.?\d+$/.test(trimmedValue)) {
    const decimalValue = parseFloat(trimmedValue);
    return decimalToTimeFormat(decimalValue);
  }

  // Parse and normalize time format
  let days = 0;
  let hours = 0;
  let minutes = 0;

  const dayMatch = trimmedValue.match(/(\d+)\s*d/);
  const hourMatch = trimmedValue.match(/(\d+)\s*h/);
  const minuteMatch = trimmedValue.match(/(\d+)\s*m/);

  if (dayMatch) days = parseInt(dayMatch[1]);
  if (hourMatch) hours = parseInt(hourMatch[1]);
  if (minuteMatch) minutes = parseInt(minuteMatch[1]);

  // Handle numbers without time indicators (assume hours and minutes)
  const numberMatches = trimmedValue.match(/\d+/g);
  if (numberMatches && !trimmedValue.match(/[dhm]/)) {
    if (numberMatches.length === 1) {
      hours = parseInt(numberMatches[0]);
    } else if (numberMatches.length === 2) {
      hours = parseInt(numberMatches[0]);
      minutes = parseInt(numberMatches[1]);
    } else if (numberMatches.length >= 3) {
      days = parseInt(numberMatches[0]);
      hours = parseInt(numberMatches[1]);
      minutes = parseInt(numberMatches[2]);
    }
  }

  // Normalize overflow
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
  }

  if (hours >= 24) {
    days += Math.floor(hours / 24);
    hours = hours % 24;
  }

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0 && trimmedValue.length > 0) {
    parts.push('0m');
  }

  return parts.join(' ');
}

// Convert decimal to time format
export function decimalToTimeFormat(decimal: number): string {
  const totalMinutes = Math.round(decimal * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) parts.push('0m');

  return parts.join(' ');
}
