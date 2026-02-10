import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GroupDetailApiService } from './group-detail-api.service';
import { environment } from '../../../environments/environment';

describe('GroupDetailApiService', () => {
  let service: GroupDetailApiService;
  let http: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    http = {
      get: vi.fn(),
      patch: vi.fn(),
    };
    service = new GroupDetailApiService(http as any);
  });

  it('getGames requests games with params', () => {
    service.getGames('group-1', 12);

    expect(http.get).toHaveBeenCalledWith(`${environment.apiUrl}/games`, {
      params: { groupId: 'group-1', limit: '12' },
    });
  });

  it('updateMemberRole sends role payload', () => {
    service.updateMemberRole('group-1', 'user-2', 'ADMIN');

    expect(http.patch).toHaveBeenCalledWith(
      `${environment.apiUrl}/groups/group-1/members/user-2/role`,
      { role: 'ADMIN' },
    );
  });
});
