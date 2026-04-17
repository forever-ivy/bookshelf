describe('learning create sheet import', () => {
  afterEach(() => {
    jest.dontMock('expo-document-picker');
  });

  it('can be imported even when expo-document-picker native module is unavailable', () => {
    jest.doMock('expo-document-picker', () => {
      throw new Error("Cannot find native module 'ExpoDocumentPicker'");
    });

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/components/learning/learning-create-sheet');
      });
    }).not.toThrow();
  });
});
