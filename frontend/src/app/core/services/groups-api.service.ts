import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateGroupRequest,
  Group,
  GroupDetail,
  GroupSearchResponse,
  GroupApplication,
  IncomingGroupApplication,
  IncomingGroupInvite,
  SentGroupInvite,
} from '../../models/group.model';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class GroupsApiService {
  constructor(private http: HttpClient) {}

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

  joinGroup(inviteCode: string): Observable<{ message: string; groupId: string }> {
    return this.http.post<{ message: string; groupId: string }>(`${API_URL}/groups/join`, {
      inviteCode,
    });
  }

  applyToGroup(groupId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/groups/${groupId}/applications`, {});
  }

  getGroupApplications(groupId: string): Observable<GroupApplication[]> {
    return this.http.get<GroupApplication[]>(`${API_URL}/groups/${groupId}/applications`);
  }

  getIncomingApplications(): Observable<IncomingGroupApplication[]> {
    return this.http.get<IncomingGroupApplication[]>(`${API_URL}/groups/applications/incoming`);
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

  getIncomingInvites(): Observable<IncomingGroupInvite[]> {
    return this.http.get<IncomingGroupInvite[]>(`${API_URL}/groups/invites/incoming`);
  }

  acceptInvite(inviteId: string): Observable<{ message: string; groupId: string }> {
    return this.http.post<{ message: string; groupId: string }>(
      `${API_URL}/groups/invites/${inviteId}/accept`,
      {},
    );
  }

  rejectInvite(inviteId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/groups/invites/${inviteId}/reject`,
      {},
    );
  }

  getSentInvites(): Observable<SentGroupInvite[]> {
    return this.http.get<SentGroupInvite[]>(`${API_URL}/groups/invites/sent`);
  }

  cancelSentInvite(inviteId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/groups/invites/${inviteId}`);
  }
}
