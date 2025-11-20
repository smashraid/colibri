import { Component } from '@angular/core';
import { Calendar } from '../../components/calendar/calendar';

@Component({
  selector: 'app-send-calendar',
  imports: [Calendar],
  templateUrl: './send-calendar.html',
  styleUrl: './send-calendar.scss',
})
export class SendCalendar {}
