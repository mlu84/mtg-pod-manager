import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Deck,
  Group,
  GroupApplication,
  GroupDetail,
  InvitableUser,
  InvitableUsersSearchResponse,
  UpdateDeckRequest,
  UpdateGroupRequest,
  CreateDeckRequest,
} from '../../models/group.model';
import { CreateGameRequest, Game, GroupEvent, RankingEntry } from '../../models/game.model';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class GroupDetailApiService {
  constructor(private http: HttpClient) {}

  getGroup(id: string): Observable<GroupDetail> {
    return this.http.get<GroupDetail>(`${API_URL}/groups/${id}`);
  }

  getGames(groupId: string, limit = 20): Observable<Game[]> {
    return this.http.get<Game[]>(`${API_URL}/games`, {
      params: { groupId, limit: limit.toString() },
    });
  }

  getEvents(groupId: string): Observable<GroupEvent[]> {
    return this.http.get<GroupEvent[]>(`${API_URL}/groups/${groupId}/events`);
  }

  getGroupApplications(groupId: string): Observable<GroupApplication[]> {
    return this.http.get<GroupApplication[]>(`${API_URL}/groups/${groupId}/applications`);
  }

  getRanking(groupId: string, snapshot = false): Observable<RankingEntry[]> {
    return this.http.get<RankingEntry[]>(`${API_URL}/games/ranking`, {
      params: { groupId, snapshot: snapshot ? 'true' : 'false' },
    });
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

  createGame(data: CreateGameRequest): Observable<Game> {
    return this.http.post<Game>(`${API_URL}/games`, data);
  }

  undoLastGame(groupId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/games/undo`, {
      params: { groupId },
    });
  }

  updateGroup(id: string, data: UpdateGroupRequest): Observable<Group> {
    return this.http.patch<Group>(`${API_URL}/groups/${id}`, data);
  }

  uploadGroupImage(id: string, file: File): Observable<{ imageUrl: string | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string | null }>(`${API_URL}/groups/${id}/image`, formData);
  }

  removeMember(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/groups/${groupId}/members/${userId}`);
  }

  updateMemberRole(
    groupId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER',
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${API_URL}/groups/${groupId}/members/${userId}/role`, {
      role,
    });
  }

  acceptGroupApplication(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/groups/${groupId}/applications/${userId}/accept`,
      {},
    );
  }

  rejectGroupApplication(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/groups/${groupId}/applications/${userId}/reject`,
      {},
    );
  }

  regenerateInviteCode(groupId: string): Observable<{ inviteCode: string }> {
    return this.http.post<{ inviteCode: string }>(`${API_URL}/groups/${groupId}/regenerate-code`, {});
  }

  resetSeason(groupId: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${API_URL}/groups/${groupId}/season-reset`, {});
  }

  deleteGroup(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/groups/${id}`);
  }

  dismissSeasonBanner(groupId: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${API_URL}/groups/${groupId}/season-banner/dismiss`, {});
  }

  searchInvitableUsers(groupId: string, query: string): Observable<InvitableUsersSearchResponse> {
    return this.http.get<InvitableUsersSearchResponse>(`${API_URL}/groups/${groupId}/invitable-users`, {
      params: { query },
    });
  }

  createUserInvite(groupId: string, targetUserId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/groups/${groupId}/invites/user`, {
      targetUserId,
    });
  }

  createEmailInvite(groupId: string, email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/groups/${groupId}/invites/email`, {
      email,
    });
  }
}
