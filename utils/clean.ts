// utils/clean.ts
import { getKv } from "./db.ts";

export async function cleanAllData() {
    const kv = await getKv();

    const prefixes = [
        ["pledges"],
        ["pledges_by_amount"],
        ["pledges_by_email"],
        ["pledges_by_session"],
        ["sessions"],
    ];

    for (const prefix of prefixes) {
        const entries = kv.list({ prefix });
        for await (const entry of entries) {
            await kv.delete(entry.key);
        }
    }
}
