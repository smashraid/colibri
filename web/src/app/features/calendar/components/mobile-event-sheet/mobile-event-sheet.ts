import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CalendarEvent } from '../../models/calendar-event';
import { EventPanel } from '../event-panel/event-panel';

interface MobileSheetData {
  events: CalendarEvent[];
  date: Date;
}

@Component({
  selector: 'app-mobile-event-sheet',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    DatePipe,
    EventPanel,
  ],
  templateUrl: './mobile-event-sheet.html',
  styleUrl: './mobile-event-sheet.scss',
})
export class MobileEventSheet {
  private _bottomSheetRef =
    inject<MatBottomSheetRef<MobileEventSheet>>(MatBottomSheetRef);

  // Inject the data passed when the bottom sheet was opened
  //private data: MobileSheetData = inject(MAT_BOTTOM_SHEET_DATA);

  // Expose data to the template
  // events = this.data.events;
  // date = this.data.date;

  /**
   * Dismisses the bottom sheet when the close button in EventPanel emits (close).
   */
  onClose(event: MouseEvent): void {
    console.log('MobileEventSheet: Dismissing bottom sheet');
    this._bottomSheetRef.dismiss();
    event.preventDefault();
  }
}
