import { describe, expect, it } from 'vitest';
import { NavigationHistoryService } from './navigation-history.service';

describe('NavigationHistoryService', () => {
  it('tracks the previous URL', () => {
    const service = new NavigationHistoryService();

    service.recordNavigation('/groups');
    service.recordNavigation('/legal');

    expect(service.getPreviousUrl()).toBe('/groups');
  });

  it('uses two-step back behavior: previous page first, fallback on repeated back from landing page', () => {
    const service = new NavigationHistoryService();

    service.recordNavigation('/groups');
    service.recordNavigation('/legal');

    expect(service.getBackTarget('/legal', '/groups')).toBe('/groups');

    service.recordNavigation('/groups');

    expect(service.getBackTarget('/groups', '/groups')).toBe('/groups');
  });

  it('clears pending second-back state after normal navigation away from the landing page', () => {
    const service = new NavigationHistoryService();

    service.recordNavigation('/groups');
    service.recordNavigation('/legal');

    expect(service.getBackTarget('/legal', '/groups')).toBe('/groups');

    service.recordNavigation('/groups');
    service.recordNavigation('/contact');
    service.recordNavigation('/groups');

    expect(service.getBackTarget('/groups', '/groups')).toBe('/contact');
  });
});
