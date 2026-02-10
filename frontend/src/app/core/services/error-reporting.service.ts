import { Injectable } from '@angular/core';
import { consumeErrorQueue, ErrorReport } from './error-reporting';

@Injectable({ providedIn: 'root' })
export class ErrorReportingService {
  private reports: ErrorReport[] = [];

  constructor() {
    this.reports = consumeErrorQueue();
  }

  report(error: unknown, context: string): void {
    this.reports.push({
      error,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  getReports(): ErrorReport[] {
    return [...this.reports];
  }
}
