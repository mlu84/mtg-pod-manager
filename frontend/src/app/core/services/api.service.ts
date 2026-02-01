import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Group,
  GroupDetail,
  CreateGroupRequest,
  Deck,
  CreateDeckRequest,
  UpdateDeckRequest,
} from '../../models/group.model';
import { Game, RankingEntry, CreateGameRequest, GroupEvent } from '../../models/game.model';
import { UserProfile, UpdateProfileRequest } from '../../models/user.model';

const API_URL = 'http://localhost:3000';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Groups
  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${API_URL}/groups`);
  }

  getGroup(id: string): Observable<GroupDetail> {
    return this.http.get<GroupDetail>(`${API_URL}/groups/${id}`);
  }

  createGroup(data: CreateGroupRequest): Observable<GroupDetail> {
    return this.http.post<GroupDetail>(`${API_URL}/groups`, data);
  }

  updateGroup(id: string, data: Partial<CreateGroupRequest>): Observable<Group> {
    return this.http.patch<Group>(`${API_URL}/groups/${id}`, data);
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

  removeMember(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${API_URL}/groups/${groupId}/members/${userId}`
    );
  }

  regenerateInviteCode(groupId: string): Observable<{ inviteCode: string }> {
    return this.http.post<{ inviteCode: string }>(
      `${API_URL}/groups/${groupId}/regenerate-code`,
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

  getRanking(groupId: string): Observable<RankingEntry[]> {
    return this.http.get<RankingEntry[]>(`${API_URL}/games/ranking`, {
      params: { groupId },
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

  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${API_URL}/users/me`, data);
  }
}
