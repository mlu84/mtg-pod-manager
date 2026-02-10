import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminGroupSearchResponse } from '../../models/group.model';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  constructor(private http: HttpClient) {}

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
    role: 'ADMIN' | 'MEMBER',
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${API_URL}/admin/groups/${groupId}/members/${userId}/role`,
      { role },
    );
  }

  adminRemoveMember(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${API_URL}/admin/groups/${groupId}/members/${userId}`,
    );
  }

  adminDeleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/admin/users/${userId}`);
  }
}
