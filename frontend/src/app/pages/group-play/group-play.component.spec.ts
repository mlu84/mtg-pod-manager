import '@angular/compiler';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupPlayComponent } from './group-play.component';
import { AuthService } from '../../core/services/auth.service';
import { GroupDetailApiService } from '../../core/services/group-detail-api.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { of } from 'rxjs';

describe('GroupPlayComponent', () => {
  let component: GroupPlayComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const parentInjector = TestBed.inject(EnvironmentInjector);

    const injector = createEnvironmentInjector(
      [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 'group-1' } } },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: GroupDetailApiService,
          useValue: { getGroup: vi.fn().mockReturnValue(of({ format: 'Commander', decks: [] })) },
        },
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
        {
          provide: NavigationHistoryService,
          useValue: { getBackTarget: vi.fn().mockReturnValue('/groups') },
        },
      ],
      parentInjector,
    );

    component = runInInjectionContext(injector, () => new GroupPlayComponent());

    const slots = Array.from({ length: 6 }).map(() => ({
      deckId: null,
      deckName: '',
      playerName: '',
      life: 20,
      poison: 0,
      commanderDamage: Array.from({ length: 6 }).map(() => 0),
    }));
    component.slots.set(slots);
  });

  it('setPlayerCount enforces min/max bounds', () => {
    component.playerCount.set(4);
    component.setPlayerCount(1);
    expect(component.playerCount()).toBe(4);

    component.setPlayerCount(5);
    expect(component.playerCount()).toBe(5);

    component.setPlayerCount(7);
    expect(component.playerCount()).toBe(5);
  });

  it('cyclePlayerCount wraps from 6 to 2', () => {
    component.playerCount.set(6);
    component.cyclePlayerCount();
    expect(component.playerCount()).toBe(2);

    component.cyclePlayerCount();
    expect(component.playerCount()).toBe(3);
  });

  it('toggleTopHalfMirror toggles the mirror state', () => {
    component.mirroredTopHalf.set(false);
    component.toggleTopHalfMirror();
    expect(component.mirroredTopHalf()).toBe(true);
  });

  it('isSlotMirrored respects column and row index', () => {
    component.playerCount.set(4);
    component.mirroredTopHalf.set(true);

    expect(component.isSlotMirrored('left', 0)).toBe(true);
    expect(component.isSlotMirrored('left', 1)).toBe(false);
  });
});
