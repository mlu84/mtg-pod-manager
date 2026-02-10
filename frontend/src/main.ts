import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { queueErrorReport } from './app/core/services/error-reporting';

bootstrapApplication(App, appConfig)
  .catch((err) => queueErrorReport(err, 'bootstrap'));
