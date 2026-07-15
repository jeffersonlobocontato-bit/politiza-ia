// Chave pública VAPID (por design é pública — usada pelo navegador ao registrar a subscription).
export const VAPID_PUBLIC_KEY =
  'BFaQ7K-xWkZYdybxByQQ_Mj5kb-ywoLZere6MaxX-jtKlsq6eLD3Weh6b7lGxiChDVWnawrgQj-Kd_KQNpjBYjA';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
