import {
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  Renderer2,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appTimeFormat]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeFormatDirective),
      multi: true,
    },
  ],
  standalone: true,
})
export class TimeFormatDirective implements ControlValueAccessor {
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private isFocused = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('focus')
  onFocus() {
    this.isFocused = true;
    // When focusing, show the raw value for editing
    const currentValue = this.el.nativeElement.value;
    if (this.isTimeFormat(currentValue)) {
      // Convert time format back to decimal for editing if needed
      const decimalValue = this.timeFormatToDecimal(currentValue);
      if (decimalValue !== null) {
        this.renderer.setProperty(
          this.el.nativeElement,
          'value',
          decimalValue.toString()
        );
      }
    }
  }

  @HostListener('blur')
  onBlur() {
    this.isFocused = false;
    this.transformTimeFormat();
    this.onTouched();
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    this.onChange(value);
  }

  private transformTimeFormat(): void {
    const value = this.el.nativeElement.value.trim();

    if (!value) {
      this.onChange('');
      return;
    }

    // If it's already in time format, keep it as is
    if (this.isTimeFormat(value)) {
      const normalizedTime = this.normalizeTimeFormat(value);
      this.renderer.setProperty(this.el.nativeElement, 'value', normalizedTime);
      this.onChange(normalizedTime);
      return;
    }

    // If it's a decimal number, convert to time format
    if (this.isDecimal(value)) {
      const timeFormat = this.decimalToTimeFormat(parseFloat(value));
      this.renderer.setProperty(this.el.nativeElement, 'value', timeFormat);
      this.onChange(timeFormat);
      return;
    }

    // If it's a mixed format (like "1h 30m"), normalize it
    if (this.containsTimeElements(value)) {
      const normalizedTime = this.normalizeTimeFormat(value);
      this.renderer.setProperty(this.el.nativeElement, 'value', normalizedTime);
      this.onChange(normalizedTime);
      return;
    }

    // If none of the above, keep the original value
    this.onChange(value);
  }

  private isDecimal(value: string): boolean {
    return /^-?\d*\.?\d+$/.test(value);
  }

  private isTimeFormat(value: string): boolean {
    return (
      /^(\d+d\s*)?(\d+h\s*)?(\d+m\s*)?$/.test(value.trim()) &&
      (value.includes('d') || value.includes('h') || value.includes('m'))
    );
  }

  private containsTimeElements(value: string): boolean {
    return /[dhm]/.test(value);
  }

  private decimalToTimeFormat(decimal: number): string {
    const totalMinutes = Math.round(decimal * 60);
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    // If all are zero, show 0m
    if (parts.length === 0) parts.push('0m');

    return parts.join(' ');
  }

  private timeFormatToDecimal(timeString: string): number | null {
    let totalMinutes = 0;

    const dayMatch = timeString.match(/(\d+)d/);
    const hourMatch = timeString.match(/(\d+)h/);
    const minuteMatch = timeString.match(/(\d+)m/);

    if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);

    return totalMinutes / 60;
  }

  private normalizeTimeFormat(timeString: string): string {
    let days = 0;
    let hours = 0;
    let minutes = 0;

    const dayMatch = timeString.match(/(\d+)d/);
    const hourMatch = timeString.match(/(\d+)h/);
    const minuteMatch = timeString.match(/(\d+)m/);

    if (dayMatch) days = parseInt(dayMatch[1]);
    if (hourMatch) hours = parseInt(hourMatch[1]);
    if (minuteMatch) minutes = parseInt(minuteMatch[1]);

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

    // If all are zero but we had time elements, show 0m
    if (parts.length === 0 && this.containsTimeElements(timeString)) {
      parts.push('0m');
    }

    return parts.join(' ');
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    if (value && !this.isFocused) {
      // Transform to time format when value is set programmatically
      if (this.isDecimal(value.toString())) {
        const timeFormat = this.decimalToTimeFormat(parseFloat(value));
        this.renderer.setProperty(this.el.nativeElement, 'value', timeFormat);
      } else if (
        this.isTimeFormat(value.toString()) ||
        this.containsTimeElements(value.toString())
      ) {
        const normalizedTime = this.normalizeTimeFormat(value.toString());
        this.renderer.setProperty(
          this.el.nativeElement,
          'value',
          normalizedTime
        );
      } else {
        this.renderer.setProperty(this.el.nativeElement, 'value', value);
      }
    } else {
      this.renderer.setProperty(this.el.nativeElement, 'value', value);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }
}
