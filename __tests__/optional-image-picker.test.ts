import { resolveImagePickerModule } from '@/lib/app/optional-image-picker';

describe('resolveImagePickerModule', () => {
  it('returns null when the native image picker runtime is unavailable', () => {
    expect(
      resolveImagePickerModule(() => {
        throw new Error("Cannot find native module 'ExponentImagePicker'");
      })
    ).toBeNull();
  });

  it('returns the loaded module when the runtime is available', () => {
    const runtime = {
      launchCameraAsync: jest.fn(),
    };

    expect(resolveImagePickerModule(() => runtime)).toBe(runtime);
  });
});
