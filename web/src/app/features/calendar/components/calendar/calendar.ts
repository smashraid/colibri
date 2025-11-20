import { Component, computed, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSidenavModule } from '@angular/material/sidenav';

import { DateUtils } from '../../utils/calendar-date';
import { CalendarEvent } from '../../models/calendar-event';
import { CalendarService } from '../../../../core/services/calendar.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/internal/operators/map';
import { CommonModule } from '@angular/common';
import { EventPanel } from '../event-panel/event-panel';
import { AppStore } from '../../../../app.store';

@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSidenavModule,
    EventPanel,
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  private breakpointObserver = inject(BreakpointObserver);
  private bottomSheet = inject(MatBottomSheet);
  private dialog = inject(MatDialog);
  private calendarService = inject(CalendarService);
  readonly store = inject(AppStore);

  // Signals
  currentDate = signal<Date>(new Date());
  selectedDate = signal<Date>(new Date());
  currentView = signal<'day' | 'week' | 'month'>('month');
  isPanelOpen = signal<boolean>(false);
  selectedDayEvents = signal<CalendarEvent[]>([]);

  // Get events from service
  events = this.calendarService.getEvents();

  // Breakpoint observer as signal
  isMobile = toSignal(
    this.breakpointObserver
      .observe('(max-width: 768px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  // Computed values using DateUtils
  weekDays = computed(() => DateUtils.getWeekDays(this.selectedDate()));
  monthDays = computed(() => DateUtils.getMonthDays(this.selectedDate()));
  hours = computed(() => DateUtils.getHours());

  currentPeriodLabel = computed(() => {
    const view = this.currentView();
    const selectedDate = this.selectedDate();

    switch (view) {
      case 'month':
        return selectedDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      case 'week':
        const weekStart = DateUtils.getWeekStartDate(selectedDate);
        const weekEnd = DateUtils.getWeekEndDate(selectedDate);
        return `Week of ${weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${weekEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
      case 'day':
        return selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      default:
        return '';
    }
  });

  onTabChange(event: MatTabChangeEvent): void {
    const viewMap = { 0: 'month', 1: 'week', 2: 'day' } as const;
    this.currentView.set(viewMap[event.index as keyof typeof viewMap]);
  }

  previous(): void {
    const currentView = this.currentView();
    const selectedDate = new Date(this.selectedDate());

    switch (currentView) {
      case 'day':
        selectedDate.setDate(selectedDate.getDate() - 1);
        break;
      case 'week':
        selectedDate.setDate(selectedDate.getDate() - 7);
        break;
      case 'month':
        selectedDate.setMonth(selectedDate.getMonth() - 1);
        break;
    }

    this.selectedDate.set(selectedDate);
  }

  next(): void {
    const currentView = this.currentView();
    const selectedDate = new Date(this.selectedDate());

    switch (currentView) {
      case 'day':
        selectedDate.setDate(selectedDate.getDate() + 1);
        break;
      case 'week':
        selectedDate.setDate(selectedDate.getDate() + 7);
        break;
      case 'month':
        selectedDate.setMonth(selectedDate.getMonth() + 1);
        break;
    }

    this.selectedDate.set(selectedDate);
  }

  goToToday(): void {
    this.selectedDate.set(new Date());
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.calendarService.getEventsForDate(date);
  }

  getEventCountForDate(date: Date): number {
    return this.getEventsForDate(date).length;
  }

  onDateSelect(date: Date): void {
    this.selectedDate.set(date);
    const events = this.getEventsForDate(date);

    if (events.length > 0) {
      this.selectedDayEvents.set(events);
      this.openEventPanel();
    }
  }

  openEventPanel(): void {
    if (this.isMobile()) {
      this.openBottomSheet();
    } else {
      this.isPanelOpen.set(true);
    }
  }

  closeEventPanel(): void {
    this.isPanelOpen.set(false);
  }

  private openBottomSheet(): void {
    this.bottomSheet.open(EventPanel, {
      data: {
        events: this.selectedDayEvents(),
        date: this.selectedDate(),
      },
    });
  }

  getEventsForDayAndHour(day: Date, hour: number): CalendarEvent[] {
    return this.events().filter((event) => {
      const eventDate = new Date(event.sendAt);
      return (
        DateUtils.isSameDay(eventDate, day) && eventDate.getHours() === hour
      );
    });
  }

  getEventPosition(event: CalendarEvent): string {
    const minutes = new Date(event.sendAt).getMinutes();
    return `${(minutes / 60) * 100}%`;
  }

  getDayAriaLabel(day: any): string {
    const eventCount = this.getEventCountForDate(day.date);
    const dateStr = day.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (eventCount === 0) {
      return `${dateStr}. No events`;
    } else if (eventCount === 1) {
      return `${dateStr}. 1 event`;
    } else {
      return `${dateStr}. ${eventCount} events`;
    }
  }

  // Utility methods
  isSameDay = DateUtils.isSameDay;
  isToday = DateUtils.isToday;
}
