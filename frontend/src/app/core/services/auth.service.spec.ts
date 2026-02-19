import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: {
    post: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    http = {
      post: vi.fn(() => of({ message: 'ok' })),
    };
    router = {
      navigate: vi.fn(),
    };

    service = new AuthService(http as any, router as any);
  });

  it('forgotPassword posts to /auth/forgot-password', () => {
    service.forgotPassword({ email: 'test@example.com' }).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      `${environment.apiUrl}/auth/forgot-password`,
      { email: 'test@example.com' },
    );
  });

  it('resetPassword posts to /auth/reset-password', () => {
    service
      .resetPassword({
        token: 'abc123tokenabc123tokenabc123tokenabc123',
        password: 'NewPassword123!',
      })
      .subscribe();

    expect(http.post).toHaveBeenCalledWith(
      `${environment.apiUrl}/auth/reset-password`,
      {
        token: 'abc123tokenabc123tokenabc123tokenabc123',
        password: 'NewPassword123!',
      },
    );
  });

  it('resendVerificationEmail posts to /auth/resend-verification', () => {
    service.resendVerificationEmail().subscribe();

    expect(http.post).toHaveBeenCalledWith(
      `${environment.apiUrl}/auth/resend-verification`,
      {},
    );
  });

  it('verifyEmailToken posts to /auth/verify', () => {
    service.verifyEmailToken('token-123').subscribe();

    expect(http.post).toHaveBeenCalledWith(`${environment.apiUrl}/auth/verify`, {
      token: 'token-123',
    });
  });
});
