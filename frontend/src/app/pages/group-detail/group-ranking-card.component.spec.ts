import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { GroupRankingCardComponent } from './group-ranking-card.component';

describe('GroupRankingCardComponent', () => {
  it('emits ranking mode toggle', () => {
    const component = new GroupRankingCardComponent();
    const emitSpy = vi.spyOn(component.rankingModeToggle, 'emit');

    component.toggleRankingMode();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits selected ranking page', () => {
    const component = new GroupRankingCardComponent();
    const emitSpy = vi.spyOn(component.rankingPageChange, 'emit');

    component.setRankingPage(2);

    expect(emitSpy).toHaveBeenCalledWith(2);
  });

  it('emits ranking search toggle', () => {
    const component = new GroupRankingCardComponent();
    const emitSpy = vi.spyOn(component.rankingSearchToggle, 'emit');

    component.toggleRankingSearch();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits games-to-history deck filter selection', () => {
    const component = new GroupRankingCardComponent();
    const emitSpy = vi.spyOn(component.rankingGamesFilterSelect, 'emit');

    component.selectHistoryDeckFromRanking('deck-1');

    expect(emitSpy).toHaveBeenCalledWith('deck-1');
  });

  it('resets ranking search term', () => {
    const component = new GroupRankingCardComponent();
    const emitSpy = vi.spyOn(component.rankingSearchChange, 'emit');

    component.clearRankingSearch();

    expect(emitSpy).toHaveBeenCalledWith('');
  });
});
