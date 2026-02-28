import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserGroupApplication } from '../../models/group.model';
import {
  NewsStatusResponse,
  UpdateProfileRequest,
  UserProfile,
} from '../../models/user.model';
import { SubmitFeedbackRequest, SubmitFeedbackResponse } from '../../models/feedback.model';
import { UserStatisticsResponse } from '../../models/analytics.model';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  constructor(private http: HttpClient) {}

  getMyApplications(): Observable<UserGroupApplication[]> {
    return this.http.get<UserGroupApplication[]>(`${API_URL}/users/me/applications`);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${API_URL}/users/me`);
  }

  getNewsStatus(): Observable<NewsStatusResponse> {
    return this.http.get<NewsStatusResponse>(`${API_URL}/users/me/news-status`);
  }

  markNewsAsRead(): Observable<NewsStatusResponse> {
    return this.http.post<NewsStatusResponse>(`${API_URL}/users/me/news/read`, {});
  }

  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${API_URL}/users/me`, data);
  }

  uploadAvatar(file: File): Observable<{ avatarUrl: string | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ avatarUrl: string | null }>(`${API_URL}/users/me/avatar`, formData);
  }

  deleteOwnAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/users/me`);
  }

  submitFeedback(data: SubmitFeedbackRequest): Observable<SubmitFeedbackResponse> {
    return this.http.post<SubmitFeedbackResponse>(`${API_URL}/users/me/feedback`, data);
  }

  getUserStatistics(from?: string, to?: string): Observable<UserStatisticsResponse> {
    let params = new HttpParams();
    const normalizedFrom = from?.trim();
    const normalizedTo = to?.trim();

    if (normalizedFrom) {
      params = params.set('from', normalizedFrom);
    }
    if (normalizedTo) {
      params = params.set('to', normalizedTo);
    }

    return this.http.get<UserStatisticsResponse>(`${API_URL}/users/me/statistics`, {
      params,
    });
  }
}
