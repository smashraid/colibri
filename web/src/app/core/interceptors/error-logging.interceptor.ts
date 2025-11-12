import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LoggingService } from '../services/logging.service';
import {
  ERROR_LOGGING_CONFIG,
  ErrorLoggingConfig,
} from './error-logging.config';

export const errorLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  const loggingService = inject(LoggingService);
  const router = inject(Router);
  const config = inject(ERROR_LOGGING_CONFIG);
  const startTime = Date.now();

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if URL should be excluded
      if (shouldExcludeUrl(req.url, config.excludeUrls)) {
        return throwError(() => error);
      }

      // Check if status code should be excluded
      if (config.excludeStatusCodes.includes(error.status)) {
        return throwError(() => error);
      }

      const duration = Date.now() - startTime;

      // Build error details based on config
      const errorDetails = buildErrorDetails(req, error, duration, config);

      // Log based on error type and config
      logError(error, req, errorDetails, loggingService, config);

      // Handle global actions (redirects, notifications, etc.)
      handleGlobalActions(error, req, router, config);

      // Re-throw the error so components can still handle it if needed
      return throwError(() => error);
    })
  );
};

function shouldExcludeUrl(url: string, excludeUrls: string[]): boolean {
  return excludeUrls.some((excludeUrl) => url.includes(excludeUrl));
}

function buildErrorDetails(
  req: HttpRequest<any>,
  error: HttpErrorResponse,
  duration: number,
  config: ErrorLoggingConfig
): any {
  const errorDetails: any = {
    request: {
      url: req.url,
      method: req.method,
      headers: extractHeaders(req.headers),
      params: extractParams(req),
    },
    response: {
      status: error.status,
      statusText: error.statusText,
      errorMessage: error.message,
    },
    performance: {
      durationMs: duration,
      timestamp: new Date().toISOString(),
    },
  };

  // Add request body if configured
  if (config.logRequestBody && req.body) {
    errorDetails.request.body = sanitizeRequestBody(req.body);
  }

  // Add response body if configured
  if (config.logResponseBody && error.error) {
    errorDetails.response.body = error.error;
  }

  return errorDetails;
}

function logError(
  error: HttpErrorResponse,
  req: HttpRequest<any>,
  errorDetails: any,
  loggingService: LoggingService,
  config: ErrorLoggingConfig
): void {
  const errorType = getErrorType(error);

  if (error.status === 0 && config.logNetworkErrors) {
    // Network error or CORS issue
    loggingService.error(
      `Network Error: Failed to reach ${req.method} ${req.url}`,
      error,
      {
        ...errorDetails,
        errorType: 'Network Error',
        possibleCause: 'CORS, Network connectivity, or server is down',
      }
    );
  } else if (
    error.status >= 500 &&
    config.logServerErrors &&
    config.log5xxErrors
  ) {
    // Server errors
    loggingService.error(
      `Server Error ${error.status}: ${req.method} ${req.url}`,
      error,
      {
        ...errorDetails,
        errorType: 'Server Error',
        severity: 'high',
      }
    );
  } else if (
    error.status >= 400 &&
    error.status < 500 &&
    config.logClientErrors &&
    config.log4xxErrors
  ) {
    // Client errors
    if (error.status === 401) {
      loggingService.warning(`Unauthorized: ${req.method} ${req.url}`, {
        ...errorDetails,
        errorType: 'Authentication Error',
        severity: 'medium',
      });
    } else if (error.status === 403) {
      loggingService.warning(`Forbidden: ${req.method} ${req.url}`, {
        ...errorDetails,
        errorType: 'Authorization Error',
        severity: 'medium',
      });
    } else if (error.status === 404) {
      loggingService.info(`Not Found: ${req.method} ${req.url}`, {
        ...errorDetails,
        errorType: 'Not Found',
        severity: 'low',
      });
    } else {
      loggingService.error(
        `Client Error ${error.status}: ${req.method} ${req.url}`,
        error,
        {
          ...errorDetails,
          errorType: 'Client Error',
          severity: 'medium',
        }
      );
    }
  }
}

function handleGlobalActions(
  error: HttpErrorResponse,
  req: HttpRequest<any>,
  router: Router,
  config: ErrorLoggingConfig
): void {
  // Handle 401 - Redirect to login
  if (error.status === 401 && config.redirectOn401) {
    console.warn('Unauthorized - redirecting to login');
    // router.navigate([config.loginUrl], {
    //   queryParams: { returnUrl: router.url },
    // });
  }

  // You can add more global actions here
  // For example: show notifications if config.showUserNotifications is true
}

function getErrorType(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return 'Client/Network Error';
  } else if (error.status === 0) {
    return 'Network Error';
  } else if (error.status >= 500) {
    return 'Server Error';
  } else if (error.status === 404) {
    return 'Not Found';
  } else if (error.status === 401) {
    return 'Unauthorized';
  } else if (error.status === 403) {
    return 'Forbidden';
  } else if (error.status >= 400) {
    return 'Client Error';
  }
  return 'Unknown Error';
}

function extractHeaders(headers: any): { [key: string]: string } {
  const headerObj: { [key: string]: string } = {};
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  headers.keys().forEach((key: string) => {
    const lowerKey = key.toLowerCase();
    if (!sensitiveHeaders.includes(lowerKey)) {
      headerObj[key] = headers.get(key);
    } else {
      headerObj[key] = '***REDACTED***';
    }
  });

  return headerObj;
}

function extractParams(req: HttpRequest<any>): { [key: string]: string } {
  const params: { [key: string]: string } = {};

  req.params.keys().forEach((key: string) => {
    const value = req.params.get(key);
    if (value) {
      params[key] = value;
    }
  });

  return params;
}

function sanitizeRequestBody(body: any): any {
  if (!body) return null;

  // Clone the body to avoid modifying the original
  const clonedBody = JSON.parse(JSON.stringify(body));

  // List of sensitive fields to redact
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'creditcard',
    'credit_card',
    'cvv',
    'ssn',
    'pin',
    'authorization',
  ];

  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item));
    }

    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });

    return obj;
  };

  return sanitize(clonedBody);
}
