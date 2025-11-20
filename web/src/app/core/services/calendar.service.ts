import { Injectable, signal } from '@angular/core';
import {
  CalendarEvent,
  EventStatus,
} from '../../features/calendar/models/calendar-event';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private events = signal<CalendarEvent[]>([]);

  constructor() {
    this.initializeSampleData();
  }

  getEvents() {
    return this.events.asReadonly();
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events().filter((event) =>
      this.isSameDay(new Date(event.sendAt), date)
    );
  }

  getEventsByStatus(status: EventStatus): CalendarEvent[] {
    return this.events().filter((event) => event.status === status);
  }

  addEvent(event: Omit<CalendarEvent, 'id'>): void {
    const newEvent: CalendarEvent = {
      ...event,
      id: this.generateId(),
    };
    this.events.update((events) => [...events, newEvent]);
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): void {
    this.events.update((events) =>
      events.map((event) =>
        event.id === id ? { ...event, ...updates } : event
      )
    );
  }

  deleteEvent(id: string): void {
    this.events.update((events) => events.filter((event) => event.id !== id));
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private initializeSampleData(): void {
    const sampleEvents: CalendarEvent[] = [
      {
        id: '1',
        name: 'MA.com_Newsletter_Nov',
        sendAt: new Date(2025, 10, 17, 10, 0),
        status: 'started',
        color: '#3f51b5',
      },
      {
        id: '2',
        name: 'MA.com_AEP_Email6',
        sendAt: new Date(2025, 10, 17, 6, 0),
        status: 'started',
        color: '#ff4081',
      },
      {
        id: '3',
        name: 'MA.com_Newsletter_Nov',
        sendAt: new Date(2025, 10, 18, 10, 0),
        status: 'scheduled',
        color: '#3f51b5',
      },
      {
        id: '4',
        name: 'MA.com_Weekly_Update',
        sendAt: new Date(2025, 10, 17, 14, 0),
        status: 'completed',
        color: '#4caf50',
      },
      {
        id: '5',
        name: 'MA.com_Special_Offer',
        sendAt: new Date(2025, 10, 17, 16, 0),
        status: 'inProgress',
        color: '#ff9800',
      },
      {
        id: '5',
        name: 'MA.com_Special_Offer5',
        sendAt: new Date(2025, 10, 20, 16, 0),
        status: 'started',
        color: '#ff4081',
      },
    ];

    this.events.set(sampleEvents);
  }
}
