import { Routes } from '@angular/router';
import { authGuard, guestGuard, sysadminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/groups',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent
      ),
  },
  {
    path: 'legal',
    loadComponent: () =>
      import('./pages/legal/legal.component').then((m) => m.LegalComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact.component').then(
        (m) => m.ContactComponent
      ),
  },
  {
    path: 'groups',
    loadComponent: () =>
      import('./pages/groups/groups.component').then((m) => m.GroupsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'groups/:id',
    loadComponent: () =>
      import('./pages/group-detail/group-detail.component').then(
        (m) => m.GroupDetailComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'groups/:id/play',
    loadComponent: () =>
      import('./pages/group-play/group-play.component').then(
        (m) => m.GroupPlayComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'archidekt-test',
    loadComponent: () =>
      import('./pages/archidekt-test/archidekt-test.component').then(
        (m) => m.ArchidektTestComponent
      ),
    canActivate: [sysadminGuard],
  },
  {
    path: 'sysadmin-users',
    loadComponent: () =>
      import('./pages/sysadmin-users/sysadmin-users.component').then(
        (m) => m.SysadminUsersComponent
      ),
    canActivate: [sysadminGuard],
  },
  {
    path: '**',
    redirectTo: '/groups',
  },
];
