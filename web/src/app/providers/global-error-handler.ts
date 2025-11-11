import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggingService } from '../services/logging.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: Error | HttpErrorResponse): void {
    const loggingService = this.injector.get(LoggingService);
    const router = this.injector.get(Router);

    if (error instanceof HttpErrorResponse) {
      // HTTP error - already logged by interceptor
      // But handle UI feedback here
      this.handleHttpError(error, router);
    } else {
      // Client-side error (Angular errors, JS errors, etc.)
      const errorMessage = error?.message || 'Unknown error occurred';
      const errorStack = error?.stack || '';

      loggingService.error(`Unhandled Client Error: ${errorMessage}`, error, {
        stack: errorStack,
        type: error?.constructor?.name,
        url: window.location.href,
      });

      // Handle UI feedback
      this.handleClientError(error);
    }

    // Still log to console for development
    if (!environment.production) {
      console.error('Global error:', error);
    }
  }

  private handleHttpError(error: HttpErrorResponse, router: Router): void {
    // Global HTTP error handling
    switch (error.status) {
      case 401:
        // Redirect to login
        console.warn('Unauthorized - redirecting to login');
        // router.navigate(['/login'], {
        //   queryParams: { returnUrl: router.url },
        // });
        break;

      case 403:
        // Show forbidden message
        console.warn('Forbidden - insufficient permissions');
        // You could show a toast/snackbar here
        break;

      case 404:
        // Optionally redirect to 404 page
        console.warn('Resource not found');
        break;

      case 500:
      case 502:
      case 503:
        // Server error - show maintenance message
        console.error('Server error occurred');
        // You could show a toast/snackbar here
        break;

      case 0:
        // Network error
        console.error('Network error - no connection');
        // You could show a toast/snackbar here
        break;

      default:
        console.error(`HTTP Error: ${error.status}`);
    }
  }

  private handleClientError(error: Error): void {
    // Handle client-side errors
    console.error('Client-side error:', error.message);
    // You could show a toast/snackbar here
  }
}
