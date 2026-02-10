import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UsersApiService } from './users-api.service';
import { environment } from '../../../environments/environment';

describe('UsersApiService', () => {
  let service: UsersApiService;
  let http: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    http = {
      get: vi.fn(),
      patch: vi.fn(),
    };
    service = new UsersApiService(http as any);
  });

  it('getMyApplications hits the correct endpoint', () => {
    service.getMyApplications();

    expect(http.get).toHaveBeenCalledWith(`${environment.apiUrl}/users/me/applications`);
  });

  it('updateProfile sends PATCH payload', () => {
    service.updateProfile({ inAppName: 'NewName' });

    expect(http.patch).toHaveBeenCalledWith(`${environment.apiUrl}/users/me`, {
      inAppName: 'NewName',
    });
  });
});
