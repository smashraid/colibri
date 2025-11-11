export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export interface ClientLog {
  app: string;
  level: LogLevel;
  message: string;
  exception?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
  additionalInfo?: any;
}
