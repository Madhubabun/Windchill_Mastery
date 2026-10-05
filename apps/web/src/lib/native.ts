/**
 * Bridge to the Android shell (apps/android). On the web every call is a no-op.
 * The shell injects `window.WindchillApp` via WebView.addJavascriptInterface.
 */
interface AndroidBridge {
  isNative(): boolean;
  appVersion(): string;
  scheduleReminder(hour: number, minute: number): void;
  cancelReminder(): void;
  requestNotificationPermission(): void;
  notificationsAllowed(): boolean;
  print(title: string): void;
  share(title: string, text: string): void;
  openExternal(url: string): void;
}

declare global {
  interface Window {
    WindchillApp?: AndroidBridge;
  }
}

export const native = (): AndroidBridge | null => (typeof window !== "undefined" && window.WindchillApp ? window.WindchillApp : null);
export const isNativeApp = () => !!native();

/** Print / save as PDF. Uses Android's print service in the app, the browser dialog on the web. */
export function printPage(title: string) {
  const n = native();
  if (n) n.print(title);
  else window.print();
}

export async function shareText(title: string, text: string, url?: string) {
  const n = native();
  if (n) return n.share(title, url ? `${text} ${url}` : text);
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch {
      /* cancelled */
    }
  }
  await navigator.clipboard?.writeText(url ? `${text} ${url}` : text);
}
