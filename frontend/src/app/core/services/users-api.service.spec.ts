import '@angular/compiler';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UsersApiService } from './users-api.service';
import { environment } from '../../../environments/environment';

describe('UsersApiService', () => {
  let service: UsersApiService;
  let http: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    http = {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
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

  it('uploadAvatar sends multipart form data', () => {
    const file = new Blob(['avatar-bytes'], { type: 'image/png' }) as unknown as File;

    service.uploadAvatar(file);

    expect(http.post).toHaveBeenCalledWith(
      `${environment.apiUrl}/users/me/avatar`,
      expect.any(FormData),
    );

    const formData = http.post.mock.calls[0][1] as FormData;
    expect(formData.has('file')).toBe(true);
  });

  it('deleteOwnAccount calls DELETE /users/me', () => {
    service.deleteOwnAccount();

    expect(http.delete).toHaveBeenCalledWith(`${environment.apiUrl}/users/me`);
  });

  it('getUserStatistics sends from/to query parameters', () => {
    service.getUserStatistics('2026-03-01', '2026-03-07');

    const [, options] = http.get.mock.calls[0];
    expect(options.params.get('from')).toBe('2026-03-01');
    expect(options.params.get('to')).toBe('2026-03-07');
    expect(options.params.get('allTime')).toBeNull();
  });

  it('getUserStatistics sends allTime query parameter when requested', () => {
    service.getUserStatistics(undefined, undefined, true);

    const [, options] = http.get.mock.calls[0];
    expect(options.params.get('allTime')).toBe('true');
  });
});
