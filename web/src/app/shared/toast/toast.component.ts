import { Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-toast',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  message = input.required<string>();
  toastType = input.required<'success' | 'warning' | 'error' | 'info'>();
  show = signal(true);

  onCloseToast() {
    this.show.update((prev) => !prev);
  }
}
