
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(
    (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  );

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;

  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
}

export async function enablePush(): Promise<PushSubscription> {
  if (!pushSupported()) {
    throw new Error("Browser push notifications are not supported.");
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error("VITE_VAPID_PUBLIC_KEY is not configured.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await getRegistration();
  const existing = await registration.pushManager.getSubscription();

  if (existing) return existing;

  const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const applicationServerKey = new ArrayBuffer(keyBytes.length);

  new Uint8Array(applicationServerKey).set(keyBytes);

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

