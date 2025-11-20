export type EventStatus =
  | 'scheduled'
  | 'started'
  | 'inProgress'
  | 'canceled'
  | 'completed';

export interface CalendarEvent {
  id: string;
  name: string;
  sendAt: Date;
  status: EventStatus;
  description?: string;
  color?: string;
}

export interface EventPanelData {
  events: CalendarEvent[];
  date: Date;
}
