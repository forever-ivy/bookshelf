export type ImagePickerModule = typeof import('expo-image-picker');
export type ImagePickerAsset = import('expo-image-picker').ImagePickerAsset;

export function resolveImagePickerModule(
  loader: () => unknown = () => require('expo-image-picker')
): ImagePickerModule | null {
  try {
    return loader() as ImagePickerModule;
  } catch {
    return null;
  }
}
