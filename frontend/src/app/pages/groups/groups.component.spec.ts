import '@angular/compiler';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { GroupsComponent } from './groups.component';
import { GroupsApiService } from '../../core/services/groups-api.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { AuthService } from '../../core/services/auth.service';

describe('GroupsComponent', () => {
  let component: GroupsComponent;
  let groupsApi: {
    getGroups: ReturnType<typeof vi.fn>;
    createGroup: ReturnType<typeof vi.fn>;
    joinGroup: ReturnType<typeof vi.fn>;
    searchGroups: ReturnType<typeof vi.fn>;
  };
  let usersApi: { getMyApplications: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const parentInjector = null as unknown as EnvironmentInjector;

    groupsApi = {
      getGroups: vi.fn(),
      createGroup: vi.fn(),
      joinGroup: vi.fn(),
      searchGroups: vi.fn(),
    };
    usersApi = {
      getMyApplications: vi.fn(),
    };

    const injector = createEnvironmentInjector(
      [
        { provide: GroupsApiService, useValue: groupsApi },
        { provide: UsersApiService, useValue: usersApi },
        {
          provide: AuthService,
          useValue: {
            isEmailVerified: signal(true),
            isSysAdmin: signal(false),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
      parentInjector,
    );

    component = runInInjectionContext(injector, () => new GroupsComponent());
  });

  it('loadGroups stores groups and clears loading', () => {
    groupsApi.getGroups.mockReturnValue(of([{ id: 'g1', name: 'Group 1' }]));

    component.loadGroups();

    expect(component.groups().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('createGroup requires name and format', () => {
    component.newGroupName = '';
    component.newGroupFormat = '';

    component.createGroup();

    expect(component.createError()).toBe('Name and format are required');
    expect(groupsApi.createGroup).not.toHaveBeenCalled();
  });

  it('joinGroup requires an invite code', () => {
    component.inviteCode = '';

    component.joinGroup();

    expect(component.joinError()).toBe('Please enter an invite code');
    expect(groupsApi.joinGroup).not.toHaveBeenCalled();
  });

  it('searchGroups validates query and updates results', () => {
    component.searchQuery = '   ';
    component.searchGroups();
    expect(component.searchError()).toBe('Please enter a search term');

    groupsApi.searchGroups.mockReturnValue(
      of({ items: [{ id: 'g1', name: 'Group 1' }], total: 1, page: 1, pageSize: 10 }),
    );
    component.searchQuery = 'Group';
    component.searchGroups();

    expect(component.searchResults().length).toBe(1);
    expect(component.searchTotal()).toBe(1);
    expect(component.searchPage()).toBe(1);
  });
});
