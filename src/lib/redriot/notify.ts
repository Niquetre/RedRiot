export function notificationSupport() {
  if (typeof window === "undefined") {
    return { supported: false, ios: false, standalone: false, permission: "unsupported" as const };
  }
  const ua = navigator.userAgent || "";
  const ios =
    /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  const supported = typeof Notification !== "undefined";
  const permission = supported ? Notification.permission : ("unsupported" as const);
  return { supported, ios, standalone, permission };
}

export async function askNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  const support = notificationSupport();
  if (!support.supported) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showSystemNotification(title: string, body: string, onOpen?: () => void): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    const notice = new Notification(title, { body, tag: "redriot" });
    notice.onclick = () => {
      window.focus();
      onOpen?.();
      notice.close();
    };
    return true;
  } catch {
    return false;
  }
}
