import '@angular/compiler';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { GroupsComponent } from './groups.component';
import { AdminApiService } from '../../core/services/admin-api.service';
import { GroupsApiService } from '../../core/services/groups-api.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NewsStateService } from '../../core/services/news-state.service';

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
          provide: AdminApiService,
          useValue: {
            getFeedbackUnreadCount: vi.fn().mockReturnValue(of({ unreadCount: 0 })),
            adminDeleteGroup: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isEmailVerified: signal(true),
            isSysAdmin: signal(false),
          },
        },
        {
          provide: NewsStateService,
          useValue: {
            hasUnreadNews: signal(false),
          },
        },
        {
          provide: NavigationHistoryService,
          useValue: {
            getBackTarget: vi.fn().mockReturnValue('/'),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
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

  it('filters visible groups by text input', () => {
    component.groups.set([
      { id: 'g1', name: 'Alpha Pod', format: 'Commander', description: 'test' } as any,
      { id: 'g2', name: 'Beta Squad', format: 'Modern', description: 'test' } as any,
    ]);

    component.groupsSearchFilter.set('alpha');

    expect(component.visibleGroups().map((group) => group.name)).toEqual(['Alpha Pod']);

    component.groupsSearchFilter.set('modern');

    expect(component.visibleGroups().map((group) => group.name)).toEqual(['Beta Squad']);
  });

  it('paginates visible groups with max 9 entries per page', () => {
    const groups = Array.from({ length: 10 }, (_, index) => ({
      id: `g-${index + 1}`,
      name: `Group ${index + 1}`,
      format: 'Commander',
      description: '',
    })) as any;

    component.groups.set(groups);

    expect(component.groupsTotalPages()).toBe(2);
    expect(component.paginatedVisibleGroups().length).toBe(9);
    expect(component.currentGroupsPage()).toBe(1);

    component.setGroupsPage(2);

    expect(component.currentGroupsPage()).toBe(2);
    expect(component.paginatedVisibleGroups().length).toBe(1);
    expect(component.paginatedVisibleGroups()[0].name).toBe('Group 10');
  });

  it('allows selecting active groups for delete confirmation', () => {
    component.groups.set([
      { id: 'active-1', name: 'Active 1', format: 'Commander', description: '', isInactive: false } as any,
    ]);

    component.toggleInactiveSelection('active-1');
    component.openDeleteInactiveModal();

    expect(component.selectedInactiveGroups().length).toBe(1);
    expect(component.selectedActiveGroups().length).toBe(1);
    expect(component.showDeleteInactiveModal()).toBe(true);
  });
});
