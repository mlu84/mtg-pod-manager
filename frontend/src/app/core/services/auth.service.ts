import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../../models/user.model';

const API_URL = environment.apiUrl;

interface TokenPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  systemRole: 'USER' | 'SYSADMIN';
  exp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSignal = signal<string | null>(this.getStoredToken());

  isAuthenticated = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;

    const payload = this.decodeToken(token);
    if (!payload) return false;

    return payload.exp * 1000 > Date.now();
  });

  isEmailVerified = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;

    const payload = this.decodeToken(token);
    return payload?.emailVerified ?? false;
  });

  currentUserId = computed(() => {
    const token = this.tokenSignal();
    if (!token) return null;

    const payload = this.decodeToken(token);
    return payload?.sub ?? null;
  });

  isSysAdmin = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;

    const payload = this.decodeToken(token);
    return payload?.systemRole === 'SYSADMIN';
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(data: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/signup`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/signin`, data).pipe(
      tap((response) => {
        this.setToken(response.access_token);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/forgot-password`, data);
  }

  resetPassword(data: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/reset-password`, data);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private setToken(token: string): void {
    localStorage.setItem('access_token', token);
    this.tokenSignal.set(token);
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}
