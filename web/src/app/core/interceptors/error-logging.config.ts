import { InjectionToken } from '@angular/core';

export interface ErrorLoggingConfig {
  logNetworkErrors: boolean;
  logClientErrors: boolean;
  logServerErrors: boolean;
  log4xxErrors: boolean;
  log5xxErrors: boolean;
  logRequestBody: boolean;
  logResponseBody: boolean;
  excludeUrls: string[];
  excludeStatusCodes: number[];
  showUserNotifications: boolean;
  redirectOn401: boolean;
  loginUrl: string;
}

export const defaultErrorLoggingConfig: ErrorLoggingConfig = {
  logNetworkErrors: true,
  logClientErrors: true,
  logServerErrors: true,
  log4xxErrors: true,
  log5xxErrors: true,
  logRequestBody: true,
  logResponseBody: true,
  excludeUrls: ['api/logClientErrorBatch'],
  excludeStatusCodes: [],
  showUserNotifications: false,
  redirectOn401: true,
  loginUrl: '/login',
};

export const ERROR_LOGGING_CONFIG = new InjectionToken<ErrorLoggingConfig>(
  'ERROR_LOGGING_CONFIG',
  {
    providedIn: 'root',
    factory: () => defaultErrorLoggingConfig,
  }
);
