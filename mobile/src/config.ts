// adb reverse keeps a secure localhost origin for canvas, crypto and workers.
export const WEB_URL = __DEV__
  ? 'http://localhost:5175'
  : 'https://sticker-studio-ruby.vercel.app';
export const WEB_ORIGIN = new URL(WEB_URL).origin;
export const API_ORIGIN = __DEV__
  ? 'http://localhost:5175'
  : 'https://stickerstudio.onrender.com';
export function isAppUrl(value: string) {
  try {
    return new URL(value).origin === WEB_ORIGIN;
  } catch {
    return false;
  }
}
