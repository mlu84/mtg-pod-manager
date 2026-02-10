import { ErrorHandler, Injectable } from '@angular/core';
import { ErrorReportingService } from './error-reporting.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private errorReporting: ErrorReportingService) {}

  handleError(error: unknown): void {
    this.errorReporting.report(error, 'global');
  }
}
