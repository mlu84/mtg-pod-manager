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
}
