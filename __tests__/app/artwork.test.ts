describe('appArtwork', () => {
  it('imports without missing asset references', () => {
    expect(() => require('../../lib/app/artwork')).not.toThrow();
  });
});
