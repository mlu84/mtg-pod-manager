import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GroupsApiService } from './groups-api.service';
import { environment } from '../../../environments/environment';

describe('GroupsApiService', () => {
  let service: GroupsApiService;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    http = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    };
    service = new GroupsApiService(http as any);
  });

  it('searchGroups sends query params', () => {
    service.searchGroups('test', 2, 5);

    expect(http.get).toHaveBeenCalledWith(`${environment.apiUrl}/groups/search`, {
      params: {
        query: 'test',
        page: '2',
        pageSize: '5',
      },
    });
  });

  it('joinGroup posts invite code', () => {
    service.joinGroup('invite-123');

    expect(http.post).toHaveBeenCalledWith(`${environment.apiUrl}/groups/join`, {
      inviteCode: 'invite-123',
    });
  });

  it('acceptInvite posts to invite accept endpoint', () => {
    service.acceptInvite('invite-1');

    expect(http.post).toHaveBeenCalledWith(
      `${environment.apiUrl}/groups/invites/invite-1/accept`,
      {},
    );
  });

  it('cancelSentInvite calls DELETE on invite endpoint', () => {
    service.cancelSentInvite('invite-2');

    expect(http.delete).toHaveBeenCalledWith(
      `${environment.apiUrl}/groups/invites/invite-2`,
    );
  });
});
