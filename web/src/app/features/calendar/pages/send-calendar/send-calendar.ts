import { Component, inject } from '@angular/core';
import { Calendar } from '../../components/calendar/calendar';
import {
  MatBottomSheet,
  MatBottomSheetConfig,
  MatBottomSheetModule,
} from '@angular/material/bottom-sheet';
import { MobileEventSheet } from '../../components/mobile-event-sheet/mobile-event-sheet';

@Component({
  selector: 'app-send-calendar',
  imports: [MatBottomSheetModule],
  templateUrl: './send-calendar.html',
  styleUrl: './send-calendar.scss',
})
export class SendCalendar {
  private _bottomSheet = inject(MatBottomSheet);
  // openBottomSheet(): void {
  //   const config: MatBottomSheetConfig = {
  //     data: {
  //       events: [],
  //       date: new Date(),
  //     },
  //     // panelClass: 'mobile-event-sheet',
  //     // hasBackdrop: true,
  //   };
  //   this._bottomSheet.open(MobileEventSheet, config);
  // }

  openBottomSheet(): void {
    this._bottomSheet.open(MobileEventSheet);
  }
}
