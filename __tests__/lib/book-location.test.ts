import { isUnresolvedBookLocation, resolveBookLocationDisplay } from '@/lib/book-location';

describe('book location display helpers', () => {
  it.each([
    [undefined],
    [null],
    [''],
    ['位置待确认'],
    ['馆藏位置待确认'],
    ['默认书柜'],
    ['主馆 2 楼 · 位置待确认'],
  ])('maps unresolved book locations to 书库 for %p', (value) => {
    expect(resolveBookLocationDisplay(value)).toBe('书库');
    expect(isUnresolvedBookLocation(value)).toBe(true);
  });

  it('keeps a real location label intact', () => {
    expect(resolveBookLocationDisplay('东区主书柜 A058')).toBe('东区主书柜 A058');
    expect(isUnresolvedBookLocation('东区主书柜 A058')).toBe(false);
  });
});
