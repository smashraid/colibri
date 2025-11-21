import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
  OnChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { CalendarEvent, EventStatus } from '../../models/calendar-event';

@Component({
  selector: 'app-event-panel',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe, // Added DatePipe for date formatting in HTML
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './event-panel.html',
  styleUrl: './event-panel.scss',
})
/**
 * EventPanel is a purely presentational component.
 * It displays events for a specific date and provides filtering.
 * It is used by both the desktop sidebar (Calendar component) and the mobile bottom sheet (MobileEventSheet component).
 * It emits the 'close' event to notify its parent container to dismiss it.
 */
export class EventPanel implements OnChanges {
  // --- Inputs & Outputs ---
  // @Input is the data source now, replacing MatBottomSheet injection.
  @Input({ required: true }) events: CalendarEvent[] = [];
  @Input({ required: true }) date: Date = new Date();

  // @Output emits when the panel needs to be closed (e.g., close button clicked).
  @Output() close = new EventEmitter<void>();

  // --- State and Computed Signals ---
  selectedStatus = signal<EventStatus | 'all'>('all');

  // Computed signal to efficiently count events by status whenever the input events change
  statusCounts = computed(() => {
    const counts = {
      all: this.events.length,
      scheduled: 0,
      started: 0,
      inProgress: 0,
      completed: 0,
      canceled: 0,
    };
    this.events.forEach((event) => {
      counts[event.status as EventStatus]++;
    });
    return counts;
  });

  // Computed signal to generate options for the status filter
  statusOptions = computed(() => {
    const counts = this.statusCounts();
    return [
      { label: 'All', value: 'all', count: counts.all },
      { label: 'Scheduled', value: 'scheduled', count: counts.scheduled },
      { label: 'Started', value: 'started', count: counts.started },
      { label: 'In Progress', value: 'inProgress', count: counts.inProgress },
      { label: 'Completed', value: 'completed', count: counts.completed },
      { label: 'Canceled', value: 'canceled', count: counts.canceled },
    ];
  });

  // Computed signal to filter the events based on the selected status
  filteredEvents = computed(() => {
    const status = this.selectedStatus();
    if (status === 'all') {
      return this.events;
    }
    return this.events.filter((event) => event.status === status);
  });

  // --- Lifecycle and Methods ---

  /**
   * Called when any input property changes. We use this to reset the default filter status.
   */
  ngOnChanges(): void {
    // Re-evaluate default status when events input changes
    this.setDefaultStatus();
  }

  private setDefaultStatus(): void {
    const counts = this.statusCounts();

    // Priority order for default selection
    if (counts.scheduled > 0) {
      this.selectedStatus.set('scheduled');
    } else if (counts.started > 0) {
      this.selectedStatus.set('started');
    } else if (counts.inProgress > 0) {
      this.selectedStatus.set('inProgress');
    } else if (counts.completed > 0) {
      this.selectedStatus.set('completed');
    } else if (counts.canceled > 0) {
      this.selectedStatus.set('canceled');
    } else {
      this.selectedStatus.set('all');
    }
  }

  onStatusChange(status: EventStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  /**
   * Emits the close event to the parent container (Calendar or MobileEventSheet).
   * The parent is responsible for handling the actual closing logic (sidenav.close() or bottomSheet.dismiss()).
   */
  onClose(): void {
    this.close.emit();
  }

  isOptionDisabled(count: number): boolean {
    return count === 0;
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
}
