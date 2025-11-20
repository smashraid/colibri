import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CalendarEvent, EventStatus } from '../../models/calendar-event';

@Component({
  selector: 'app-event-panel',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './event-panel.html',
  styleUrl: './event-panel.scss',
})
export class EventPanel {
  private bottomSheetRef = inject(MatBottomSheetRef<EventPanel>, {
    optional: true,
  });
  private panelData = inject(MAT_BOTTOM_SHEET_DATA, { optional: true });

  @Input() events: CalendarEvent[] = [];
  @Input() date: Date = new Date();
  @Output() close = new EventEmitter<void>();

  // Signals
  selectedStatus = signal<EventStatus | 'all'>('started');
  filteredEvents = computed(() => {
    const status = this.selectedStatus();
    if (status === 'all') {
      return this.events;
    }
    return this.events.filter((event) => event.status === status);
  });

  // Status counts
  statusCounts = computed(() => {
    const counts: Record<EventStatus | 'all', number> = {
      all: this.events.length,
      scheduled: this.events.filter((e) => e.status === 'scheduled').length,
      started: this.events.filter((e) => e.status === 'started').length,
      inProgress: this.events.filter((e) => e.status === 'inProgress').length,
      canceled: this.events.filter((e) => e.status === 'canceled').length,
      completed: this.events.filter((e) => e.status === 'completed').length,
    };
    return counts;
  });

  // Status options for dropdown
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
      label: this.formatStatusLabel(status),
      count: this.statusCounts()[status],
    }));
  });

  ngOnInit(): void {
    // If opened via bottom sheet, use injected data
    if (this.panelData && !this.events.length) {
      this.events = this.panelData.events;
      this.date = this.panelData.date;
    }

    // Set default selection based on available events
    this.setDefaultStatus();
  }

  private setDefaultStatus(): void {
    const counts = this.statusCounts();

    // Priority order for default selection
    if (counts.started > 0) {
      this.selectedStatus.set('started');
    } else if (counts.scheduled > 0) {
      this.selectedStatus.set('scheduled');
    } else if (counts.inProgress > 0) {
      this.selectedStatus.set('inProgress');
    } else if (counts.completed > 0) {
      this.selectedStatus.set('completed');
    } else if (counts.canceled > 0) {
      this.selectedStatus.set('canceled');
    }
  }

  onStatusChange(status: EventStatus): void {
    this.selectedStatus.set(status);
  }

  onClose(): void {
    if (this.bottomSheetRef) {
      this.bottomSheetRef.dismiss();
    } else {
      this.close.emit();
    }
  }

  getStatusColor(status: EventStatus): string {
    const colors: Record<EventStatus, string> = {
      scheduled: '#3f51b5',
      started: '#2196f3',
      inProgress: '#ff9800',
      completed: '#4caf50',
      canceled: '#f44336',
    };
    return colors[status];
  }

  isOptionDisabled(count: number): boolean {
    return count === 0;
  }

  private formatStatusLabel(status: EventStatus): string {
    const labels: Record<EventStatus, string> = {
      scheduled: 'Scheduled',
      started: 'Started',
      inProgress: 'In Progress',
      completed: 'Completed',
      canceled: 'Canceled',
    };
    return labels[status];
  }
}
