export interface User {
  id: string;
  email: string;
  inAppName: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  access_token: string;
  emailVerified: boolean;
}

export interface RegisterRequest {
  email: string;
  inAppName: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  inAppName: string;
  emailVerified: string | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  inAppName?: string;
}
