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
 * EventPanel is a purely presentational component, used as the content
 * for both the desktop sidebar and the mobile bottom sheet (via MobileEventSheet).
 */
export class EventPanel {
  // Inputs from the parent component (Calendar or MobileEventSheet)
  @Input({ required: true }) events: CalendarEvent[] = [];
  @Input({ required: true }) date: Date = new Date();

  // Output event to notify the parent to close the panel/sheet
  @Output() close = new EventEmitter<void>();

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
      { label: 'Completed', value: 'Completed', count: counts.completed },
      { label: 'Canceled', value: 'Canceled', count: counts.canceled },
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

  // Effect to set a default status when the input events array changes
  // This uses a timeout to ensure all inputs and signals are stable
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
