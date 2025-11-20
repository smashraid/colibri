import { Routes } from '@angular/router';
import { SendCalendar } from './pages/send-calendar/send-calendar';

export const CALENDAR_ROUTES: Routes = [
  {
    path: '',
    component: SendCalendar,
    title: 'Send Calendar',
  },
];
