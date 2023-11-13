import nextAppSession from 'next-app-session';

type SessionData = {
  submission?: string;
};

export const instance = nextAppSession<SessionData>({
  name: 'SID',
  secret: process.env.SESSION_SECRET || 'secret',
});

export async function get<T extends string = string>(
  id: string,
  key: string
): Promise<T | null> {
  const session = instance();
  return (await session.get(`${key}_${id}`)) || null;
}

export async function getJSON<T = unknown>(
  id: string,
  key: string
): Promise<T | null> {
  const value = await get(id, key);
  return typeof value === 'string' ? JSON.parse(value) : null;
}

export async function set<T extends string = string>(
  id: string,
  key: string,
  value: T | null
): Promise<void> {
  const session = instance();
  if (value === null) {
    await session.destroy(key);
  } else {
    await session.set(`${key}_${id}`, value);
  }
}
export async function setJSON<T = unknown>(
  id: string,
  key: string,
  value: T | null
): Promise<void> {
  if (value === null) {
    await set(id, key, null);
  } else {
    await set(id, key, JSON.stringify(value));
  }
}
