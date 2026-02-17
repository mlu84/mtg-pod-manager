import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserGroupApplication } from '../../models/group.model';
import { UpdateProfileRequest, UserProfile } from '../../models/user.model';

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
}
