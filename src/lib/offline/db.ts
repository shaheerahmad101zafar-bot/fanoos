import Dexie, { type Table } from "dexie";

export type QueueRow = {
  id: string;
  at: number;
  kind: string;
  userId?: string;
  payload: Record<string, unknown>;
};

export type SnapRow = {
  key: string;
  value: unknown;
  at: number;
};

class LocalDB extends Dexie {
  queue!: Table<QueueRow, string>;
  snap!: Table<SnapRow, string>;

  constructor() {
    super("fanoos-local");
    this.version(1).stores({
      queue: "id, at, kind",
      snap: "key",
    });
    this.version(2).stores({
      queue: "id, at, kind, userId",
      snap: "key",
    });
  }
}

export const localDb = typeof window === "undefined" ? null : new LocalDB();

export async function saveSnap(key: string, value: unknown) {
  if (!localDb) return;
  await localDb.snap.put({ key, value, at: Date.now() });
}

export async function loadSnap<T>(key: string): Promise<T | null> {
  if (!localDb) return null;
  const row = await localDb.snap.get(key);
  return (row?.value as T) ?? null;
}
