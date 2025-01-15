// utils/db.ts
import { Pledge } from "../types.ts";

let kv: Deno.Kv | null = null;

export async function getKv() {
  if (!kv) {
    try {
      kv = await Deno.openKv();
    } catch (error) {
      console.error("Failed to open KV store:", error);
      throw error;
    }
  }
  return kv;
}

// Helper function to create safe KV keys
function createKey(parts: string[]): string[] {
  return parts.map((part) => String(part));
}

async function getLatestPledges(): Promise<Pledge[]> {
  try {
    const db = await getKv();
    const allPledges: Pledge[] = [];
    const entries = db.list({ prefix: createKey(["pledges"]) });

    for await (const entry of entries) {
      if (entry.value) {
        allPledges.push(entry.value as Pledge);
      }
    }

    // Group by email and get latest pledge for each user
    const latestPledges = allPledges.reduce((acc, pledge) => {
      const existing = acc.get(pledge.email);
      if (
        !existing || new Date(pledge.timestamp!) > new Date(existing.timestamp!)
      ) {
        acc.set(pledge.email, pledge);
      }
      return acc;
    }, new Map<string, Pledge>());

    return Array.from(latestPledges.values());
  } catch (error) {
    console.error("Error getting latest pledges:", error);
    return [];
  }
}

export async function savePledge(pledge: Pledge, sessionId: string) {
  const db = await getKv();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const pledgeData = {
    ...pledge,
    id,
    timestamp,
    sessionId,
  };

  try {
    // Use atomic operation with proper key creation
    await db.atomic()
      .set(createKey(["pledges", id]), pledgeData)
      .set(createKey(["sessions", sessionId]), id)
      .commit();

    return id;
  } catch (error) {
    console.error("Error saving pledge:", error);
    throw error;
  }
}

export async function getPledgeBySession(
  sessionId: string,
): Promise<Pledge | null> {
  try {
    const db = await getKv();
    const result = await db.get(createKey(["sessions", sessionId]));
    if (!result.value) return null;

    const pledgeResult = await db.get(
      createKey(["pledges", result.value as string]),
    );
    return pledgeResult.value as Pledge || null;
  } catch (error) {
    console.error("Error getting pledge:", error);
    return null;
  }
}

export async function getTopPledges(limit = 20): Promise<Pledge[]> {
  try {
    const latestPledges = await getLatestPledges();
    return latestPledges
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting pledges:", error);
    return [];
  }
}

export async function getTotalPledged(): Promise<number> {
  try {
    const latestPledges = await getLatestPledges();
    return latestPledges.reduce((total, pledge) => total + pledge.amount, 0);
  } catch (error) {
    console.error("Error calculating total:", error);
    return 0;
  }
}

export async function cleanAllData() {
  const db = await getKv();
  const prefixes = [["pledges"], ["sessions"]];

  for (const prefix of prefixes) {
    const entries = db.list({ prefix: createKey(prefix) });
    for await (const entry of entries) {
      await db.delete(entry.key);
    }
  }
}

// Admin Features

export async function saveAuditLog(log: AuditLog) {
  const db = await getKv();
  await db.set(["audit", log.id], log);
}

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const db = await getKv();
  const logs: AuditLog[] = [];
  const entries = db.list<AuditLog>({ prefix: ["audit"] });
  
  for await (const entry of entries) {
    if (entry.value) logs.push(entry.value);
  }
  
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, limit);
}