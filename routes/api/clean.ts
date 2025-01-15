// routes/api/clean.ts
import { Handlers } from "$fresh/server.ts";
import { cleanAllData } from "../../utils/clean.ts";

export const handler: Handlers = {
    async POST(req) {
        const adminKey = req.headers.get("admin-key");
        if (adminKey !== Deno.env.get("ADMIN_KEY")) {
            return new Response("Unauthorized", { status: 401 });
        }

        await cleanAllData();
        return new Response("Data cleaned successfully");
    },
};
