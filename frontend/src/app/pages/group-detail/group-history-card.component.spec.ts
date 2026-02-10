import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { GroupHistoryCardComponent } from './group-history-card.component';

describe('GroupHistoryCardComponent', () => {
  it('emits selected filter', () => {
    const component = new GroupHistoryCardComponent();
    const emitSpy = vi.spyOn(component.historyFilterChange, 'emit');

    component.setFilter('games');

    expect(emitSpy).toHaveBeenCalledWith('games');
  });

  it('emits selected page', () => {
    const component = new GroupHistoryCardComponent();
    const emitSpy = vi.spyOn(component.historyPageChange, 'emit');

    component.setPage(3);

    expect(emitSpy).toHaveBeenCalledWith(3);
  });

  it('emits undo action', () => {
    const component = new GroupHistoryCardComponent();
    const emitSpy = vi.spyOn(component.undoLast, 'emit');

    component.undoLastGame();

    expect(emitSpy).toHaveBeenCalled();
  });
});
