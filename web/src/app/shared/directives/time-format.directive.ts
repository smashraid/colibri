import {
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  normalizeTimeFormat,
  validateTimeFormat,
} from '../validators/timeFormat';

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

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('blur', ['$event'])
  onBlur(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.transformToNormalizedTimeFormat(inputValue);
    this.onTouched();
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.onChange(inputValue);
  }

  private transformToNormalizedTimeFormat(value: string): void {
    const normalizedTime = normalizeTimeFormat(value);
    this.updateView(normalizedTime);
  }

  private updateView(value: string): void {
    this.renderer.setProperty(this.el.nativeElement, 'value', value);
    this.onChange(value);
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    if (value == null || value === '') {
      this.renderer.setProperty(this.el.nativeElement, 'value', '');
      return;
    }

    const normalizedTime = normalizeTimeFormat(value.toString());
    this.renderer.setProperty(this.el.nativeElement, 'value', normalizedTime);
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
