import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';
import { ClientLog, LogLevel } from '../view-models/client-log.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { of } from 'rxjs/internal/observable/of';

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private readonly apiUrl = `${environment.digitalCommunication.url}operation/logClientErrorBatch`;
  private readonly authorizationToken = environment.digitalCommunication.token;
  private logQueue: ClientLog[] = [];
  private isProcessing = false;
  private readonly maxQueueSize = 50;
  private readonly batchSize = 10;
  private readonly flushInterval = 5000;

  constructor(private http: HttpClient) {
    // Start periodic flush flushLogsSync send in batch
    // flushLogs send one by one
    setInterval(() => this.flushLogsSync(), this.flushInterval);

    // Flush on page unload with sync XHR
    window.addEventListener('beforeunload', () => this.flushLogsSync());
  }

  debug(message: string, additionalInfo?: any): void {
    this.log(LogLevel.Debug, message, undefined, additionalInfo);
  }

  info(message: string, additionalInfo?: any): void {
    this.log(LogLevel.Info, message, undefined, additionalInfo);
  }

  warning(message: string, additionalInfo?: any): void {
    this.log(LogLevel.Warning, message, undefined, additionalInfo);
  }

  error(message: string, error?: Error | any, additionalInfo?: any): void {
    const exception =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack}`
        : JSON.stringify(error);

    this.log(LogLevel.Error, message, exception, additionalInfo);
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sanitized = JSON.parse(JSON.stringify(data));

    const sensitiveFields = [
      'password',
      'creditCard',
      'ssn',
      'token',
      'secret',
    ];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      Object.keys(obj).forEach((key) => {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  // Use this for logging with automatic sanitization
  infoSafe(message: string, additionalInfo?: any): void {
    const sanitized = this.sanitizeData(additionalInfo);
    this.info(message, sanitized);
  }

  errorSafe(message: string, error?: Error | any, additionalInfo?: any): void {
    const sanitized = this.sanitizeData(additionalInfo);
    this.error(message, error, sanitized);
  }

  private log(
    level: LogLevel,
    message: string,
    exception?: string,
    additionalInfo?: any
  ): void {
    const logEntry: ClientLog = {
      app: 'COLIBRI',
      level,
      message,
      exception,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date(),
      additionalInfo,
    };

    this.logQueue.push(logEntry);

    // Also log to console in development
    if (!environment.production) {
      this.logToConsole(level, message, exception, additionalInfo);
    }

    // Flush if queue is full or if it's an error
    if (this.logQueue.length >= this.maxQueueSize || level === LogLevel.Error) {
      this.flushLogsSync();
    }
  }

  public logToConsole(
    level: LogLevel,
    message: string,
    exception?: string,
    additionalInfo?: any
  ): void {
    const logArgs = [message];
    if (additionalInfo) logArgs.push(additionalInfo);
    if (exception) logArgs.push(exception);

    switch (level) {
      case LogLevel.Debug:
        console.debug(...logArgs);
        break;
      case LogLevel.Info:
        console.info(...logArgs);
        break;
      case LogLevel.Warning:
        console.warn(...logArgs);
        break;
      case LogLevel.Error:
        console.error(...logArgs);
        break;
    }
  }

  private flushLogs(): void {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToSend = this.logQueue.splice(0, this.batchSize);

    logsToSend.forEach((log) => {
      this.http
        .post(this.apiUrl, log)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Failed to send log to server:', error);
            return of(null);
          })
        )
        .subscribe();
    });

    this.isProcessing = false;
  }

  private flushLogsSync(): void {
    console.log('flushLogsSync', this.logQueue.length);

    if (this.logQueue.length === 0) return;

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiUrl}`, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('AuthorizationToken', this.authorizationToken);

      xhr.send(JSON.stringify(this.logQueue));
      this.logQueue = [];
    } catch (error) {
      console.error('Failed to flush logs on unload:', error);
    }
  }
}
