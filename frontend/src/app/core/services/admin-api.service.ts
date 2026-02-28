import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminGroupSearchResponse } from '../../models/group.model';
import { AdminFeedbackListResponse } from '../../models/feedback.model';
import { AdminAnalyticsResponse } from '../../models/analytics.model';

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

  getFeedbackEntries(params: {
    query?: string;
    from?: string;
    to?: string;
    status?: 'all' | 'unread' | 'read';
    page?: number;
    pageSize?: number;
  }): Observable<AdminFeedbackListResponse> {
    let httpParams = new HttpParams()
      .set('status', params.status ?? 'all')
      .set('page', (params.page ?? 1).toString())
      .set('pageSize', (params.pageSize ?? 20).toString());

    const query = params.query?.trim();
    const from = params.from?.trim();
    const to = params.to?.trim();

    if (query) {
      httpParams = httpParams.set('query', query);
    }
    if (from) {
      httpParams = httpParams.set('from', from);
    }
    if (to) {
      httpParams = httpParams.set('to', to);
    }

    return this.http.get<AdminFeedbackListResponse>(`${API_URL}/admin/feedback`, {
      params: httpParams,
    });
  }

  getFeedbackUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${API_URL}/admin/feedback/unread-count`);
  }

  markFeedbackAsRead(ids: string[]): Observable<{ message: string; affected: number }> {
    return this.http.patch<{ message: string; affected: number }>(
      `${API_URL}/admin/feedback/mark-read`,
      { ids },
    );
  }

  deleteFeedback(ids: string[]): Observable<{ message: string; affected: number }> {
    return this.http.request<{ message: string; affected: number }>('DELETE', `${API_URL}/admin/feedback`, {
      body: { ids },
    });
  }

  getAnalytics(from?: string, to?: string): Observable<AdminAnalyticsResponse> {
    let params = new HttpParams();
    const normalizedFrom = from?.trim();
    const normalizedTo = to?.trim();

    if (normalizedFrom) {
      params = params.set('from', normalizedFrom);
    }
    if (normalizedTo) {
      params = params.set('to', normalizedTo);
    }

    return this.http.get<AdminAnalyticsResponse>(`${API_URL}/admin/analytics`, {
      params,
    });
  }
}
