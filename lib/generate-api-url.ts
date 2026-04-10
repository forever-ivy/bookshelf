import Constants from 'expo-constants';

export function generateAPIUrl(relativePath: string) {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const experienceUrl = (Constants as typeof Constants & { experienceUrl?: string }).experienceUrl;

  if (process.env.NODE_ENV === 'development' && experienceUrl) {
    return experienceUrl.replace('exp://', 'http://').concat(path);
  }

  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return `${process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '')}${path}`;
  }

  return path;
}
