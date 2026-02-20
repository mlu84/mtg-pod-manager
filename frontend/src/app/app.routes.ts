import { Routes } from '@angular/router';
import { authGuard, guestGuard, sysadminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    data: {
      metaTitle: 'MTG Pod-Manager | MTG Group Organizer',
      canonicalPath: '/',
      metaDescription:
        'MTG Pod-Manager helps Magic: The Gathering playgroups organize players, decks, game records, and rankings.',
      metaRobots: 'index,follow',
    },
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
    data: {
      metaTitle: 'Login | MTG Pod-Manager',
      canonicalPath: '/login',
      metaDescription:
        'Log in to MTG Pod-Manager to manage your Magic: The Gathering groups, decks, and game history.',
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [guestGuard],
    data: {
      metaTitle: 'Create Account | MTG Pod-Manager',
      canonicalPath: '/register',
      metaDescription:
        'Create your MTG Pod-Manager account to organize MTG groups, track games, and monitor standings.',
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
    canActivate: [guestGuard],
    data: {
      metaTitle: 'Forgot Password | MTG Pod-Manager',
      canonicalPath: '/forgot-password',
      metaDescription:
        'Request a secure password reset link for your MTG Pod-Manager account.',
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
    canActivate: [guestGuard],
    data: {
      metaTitle: 'Reset Password | MTG Pod-Manager',
      canonicalPath: '/reset-password',
      metaDescription:
        'Set a new password for your MTG Pod-Manager account and return to your groups.',
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent
      ),
    data: {
      metaTitle: 'Verify Email | MTG Pod-Manager',
      canonicalPath: '/verify-email',
      metaDescription:
        'Verify your email address to activate all MTG Pod-Manager features.',
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'legal',
    loadComponent: () =>
      import('./pages/legal/legal.component').then((m) => m.LegalComponent),
    data: {
      metaTitle: 'Legal | MTG Pod-Manager',
      canonicalPath: '/legal',
      metaDescription:
        'Read MTG Pod-Manager legal information including privacy and terms details.',
      metaRobots: 'index,follow',
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact.component').then(
        (m) => m.ContactComponent
      ),
    data: {
      metaTitle: 'Contact | MTG Pod-Manager',
      canonicalPath: '/contact',
      metaDescription:
        'Contact MTG Pod-Manager for legal, service, and data protection inquiries.',
      metaRobots: 'index,follow',
    },
  },
  {
    path: 'groups',
    loadComponent: () =>
      import('./pages/groups/groups.component').then((m) => m.GroupsComponent),
    canActivate: [authGuard],
    data: {
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'groups/:id',
    loadComponent: () =>
      import('./pages/group-detail/group-detail.component').then(
        (m) => m.GroupDetailComponent
      ),
    canActivate: [authGuard],
    data: {
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'groups/:id/play',
    loadComponent: () =>
      import('./pages/group-play/group-play.component').then(
        (m) => m.GroupPlayComponent
      ),
    canActivate: [authGuard],
    data: {
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'archidekt-test',
    loadComponent: () =>
      import('./pages/archidekt-test/archidekt-test.component').then(
        (m) => m.ArchidektTestComponent
      ),
    canActivate: [sysadminGuard],
    data: {
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: 'sysadmin-users',
    loadComponent: () =>
      import('./pages/sysadmin-users/sysadmin-users.component').then(
        (m) => m.SysadminUsersComponent
      ),
    canActivate: [sysadminGuard],
    data: {
      metaRobots: 'noindex,nofollow',
    },
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
