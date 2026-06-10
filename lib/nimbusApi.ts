import { Platform } from 'react-native';

export type ChatRole = 'user' | 'assistant';
export type ChatMsg = { role: ChatRole; content: string };

function getBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Replit dev pattern: https://5000-slug.user.replit.dev → https://3001-slug.user.replit.dev
    if (/\/\/\d+[-.]/.test(origin)) {
      return origin.replace(/^(https?:\/\/)\d+([-.])/, '$13001$2');
    }
    // Local: replace port
    return origin.replace(/:\d+$/, ':3001');
  }
  return 'http://localhost:3001';
}

export async function sendToNimbus(params: {
  messages: ChatMsg[];
  context?: string;
  mode?: string | null;
}): Promise<string> {
  const url = `${getBaseUrl()}/api/nimbus`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: params.messages,
      context: params.context ?? '',
      mode: params.mode ?? null,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Nimbus is unavailable right now.');
  return json.reply as string;
}

export async function generateNimbusLetter(params: {
  context: string;
  type: 'weekly' | 'monthly';
}): Promise<string> {
  const url = `${getBaseUrl()}/api/nimbus/letter`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Could not generate letter.');
  return json.letter as string;
}
