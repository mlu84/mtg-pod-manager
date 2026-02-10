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
});
