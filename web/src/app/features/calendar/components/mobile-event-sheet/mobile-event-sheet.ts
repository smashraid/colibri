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
import { CalendarEvent, EventStatus } from '../../models/calendar-event';

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
  ],
  templateUrl: './mobile-event-sheet.html',
  styleUrl: './mobile-event-sheet.scss',
})
export class MobileEventSheet {
  private _bottomSheetRef = inject(MatBottomSheetRef<MobileEventSheet>);
  public data = inject(MAT_BOTTOM_SHEET_DATA);

  events: CalendarEvent[] = this.data.events || [];
  date: Date = this.data.date || new Date();

  selectedStatus = signal<EventStatus | 'all'>('started');

  filteredEvents = computed(() => {
    const status = this.selectedStatus();
    return status === 'all'
      ? this.events
      : this.events.filter((e) => e.status === status);
  });

  statusCounts = computed(() => {
    // Recalculate counts based on current events
    const counts: any = { all: this.events.length };
    const statuses: EventStatus[] = [
      'scheduled',
      'started',
      'inProgress',
      'canceled',
      'completed',
    ];
    statuses.forEach(
      (s) => (counts[s] = this.events.filter((e) => e.status === s).length)
    );
    return counts;
  });

  statusOptions = computed(() => {
    const statuses: EventStatus[] = [
      'started',
      'scheduled',
      'inProgress',
      'completed',
      'canceled',
    ];
    return statuses.map((status) => ({
      value: status,
      label:
        status.charAt(0).toUpperCase() +
        status
          .slice(1)
          .replace(/([A-Z])/g, ' $1')
          .trim(),
      count: this.statusCounts()[status] || 0,
    }));
  });

  constructor() {
    this.setDefaultStatus();
  }

  private setDefaultStatus(): void {
    const counts = this.statusCounts();
    if (counts.started > 0) this.selectedStatus.set('started');
    else if (counts.scheduled > 0) this.selectedStatus.set('scheduled');
    else if (counts.inProgress > 0) this.selectedStatus.set('inProgress');
    else this.selectedStatus.set('all');
  }

  onStatusChange(status: EventStatus): void {
    this.selectedStatus.set(status);
  }

  close(): void {
    this._bottomSheetRef.dismiss();
  }

  getStatusColor(status: string): string {
    const colors: any = {
      scheduled: '#3f51b5',
      started: '#2196f3',
      inProgress: '#ff9800',
      completed: '#4caf50',
      canceled: '#f44336',
    };
    return colors[status] || '#grey';
  }

  isOptionDisabled(count: number): boolean {
    return count === 0;
  }
}
