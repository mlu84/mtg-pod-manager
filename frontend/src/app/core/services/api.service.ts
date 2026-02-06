import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  Group,
  GroupDetail,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupSearchResponse,
  UserGroupApplication,
  GroupApplication,
  AdminGroupSearchResponse,
  Deck,
  CreateDeckRequest,
  UpdateDeckRequest,
} from '../../models/group.model';
import { Game, RankingEntry, CreateGameRequest, GroupEvent } from '../../models/game.model';
import { UserProfile, UpdateProfileRequest } from '../../models/user.model';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Groups
  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${API_URL}/groups`);
  }

  searchGroups(query: string, page = 1, pageSize = 10): Observable<GroupSearchResponse> {
    return this.http.get<GroupSearchResponse>(`${API_URL}/groups/search`, {
      params: {
        query,
        page: page.toString(),
        pageSize: pageSize.toString(),
      },
    });
  }

  getGroup(id: string): Observable<GroupDetail> {
    return this.http.get<GroupDetail>(`${API_URL}/groups/${id}`);
  }

  createGroup(data: CreateGroupRequest): Observable<GroupDetail> {
    return this.http.post<GroupDetail>(`${API_URL}/groups`, data);
  }

  updateGroup(id: string, data: UpdateGroupRequest): Observable<Group> {
    return this.http.patch<Group>(`${API_URL}/groups/${id}`, data);
  }

  uploadGroupImage(id: string, file: File): Observable<{ imageUrl: string | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string | null }>(
      `${API_URL}/groups/${id}/image`,
      formData
    );
  }

  deleteGroup(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/groups/${id}`);
  }

  joinGroup(inviteCode: string): Observable<{ message: string; groupId: string }> {
    return this.http.post<{ message: string; groupId: string }>(
      `${API_URL}/groups/join`,
      { inviteCode }
    );
  }

  applyToGroup(groupId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/groups/${groupId}/applications`,
      {}
    );
  }

  getGroupApplications(groupId: string): Observable<GroupApplication[]> {
    return this.http.get<GroupApplication[]>(
      `${API_URL}/groups/${groupId}/applications`
    );
  }

  acceptGroupApplication(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/groups/${groupId}/applications/${userId}/accept`,
      {}
    );
  }

  rejectGroupApplication(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/groups/${groupId}/applications/${userId}/reject`,
      {}
    );
  }

  removeMember(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${API_URL}/groups/${groupId}/members/${userId}`
    );
  }

  updateMemberRole(
    groupId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER'
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${API_URL}/groups/${groupId}/members/${userId}/role`,
      { role }
    );
  }

  regenerateInviteCode(groupId: string): Observable<{ inviteCode: string }> {
    return this.http.post<{ inviteCode: string }>(
      `${API_URL}/groups/${groupId}/regenerate-code`,
      {}
    );
  }

  resetSeason(groupId: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(
      `${API_URL}/groups/${groupId}/season-reset`,
      {}
    );
  }

  dismissSeasonBanner(groupId: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(
      `${API_URL}/groups/${groupId}/season-banner/dismiss`,
      {}
    );
  }

  // Decks
  getDecks(groupId: string): Observable<Deck[]> {
    return this.http.get<Deck[]>(`${API_URL}/decks`, {
      params: { groupId },
    });
  }

  getDeck(id: string): Observable<Deck> {
    return this.http.get<Deck>(`${API_URL}/decks/${id}`);
  }

  createDeck(data: CreateDeckRequest): Observable<Deck> {
    return this.http.post<Deck>(`${API_URL}/decks`, data);
  }

  updateDeck(id: string, data: UpdateDeckRequest): Observable<Deck> {
    return this.http.patch<Deck>(`${API_URL}/decks/${id}`, data);
  }

  deleteDeck(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/decks/${id}`);
  }

  refreshDeckArchidekt(id: string): Observable<Deck> {
    return this.http.post<Deck>(`${API_URL}/decks/${id}/refresh-archidekt`, {});
  }

  // Games
  getGames(groupId: string, limit = 20): Observable<Game[]> {
    return this.http.get<Game[]>(`${API_URL}/games`, {
      params: { groupId, limit: limit.toString() },
    });
  }

  getGame(id: string): Observable<Game> {
    return this.http.get<Game>(`${API_URL}/games/${id}`);
  }

  createGame(data: CreateGameRequest): Observable<Game> {
    return this.http.post<Game>(`${API_URL}/games`, data);
  }

  getRanking(groupId: string, snapshot = false): Observable<RankingEntry[]> {
    return this.http.get<RankingEntry[]>(`${API_URL}/games/ranking`, {
      params: { groupId, snapshot: snapshot ? 'true' : 'false' },
    });
  }

  undoLastGame(groupId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/games/undo`, {
      params: { groupId },
    });
  }

  // Events
  getEvents(groupId: string): Observable<GroupEvent[]> {
    return this.http.get<GroupEvent[]>(`${API_URL}/groups/${groupId}/events`);
  }

  // Profile
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${API_URL}/users/me`);
  }

  getMyApplications(): Observable<UserGroupApplication[]> {
    return this.http.get<UserGroupApplication[]>(`${API_URL}/users/me/applications`);
  }

  // Sysadmin
  getAdminGroups(query = '', page = 1, pageSize = 10): Observable<AdminGroupSearchResponse> {
    return this.http.get<AdminGroupSearchResponse>(`${API_URL}/admin/groups`, {
      params: {
        query,
        page: page.toString(),
        pageSize: pageSize.toString(),
      },
    });
  }

  adminDeleteGroup(groupId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/admin/groups/${groupId}`);
  }

  adminRenameUser(userId: string, inAppName: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${API_URL}/admin/users/${userId}/rename`, {
      inAppName,
    });
  }

  adminUpdateMemberRole(
    groupId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER'
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${API_URL}/admin/groups/${groupId}/members/${userId}/role`,
      { role }
    );
  }

  adminRemoveMember(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${API_URL}/admin/groups/${groupId}/members/${userId}`
    );
  }

  adminDeleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/admin/users/${userId}`);
  }

  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${API_URL}/users/me`, data);
  }
}
