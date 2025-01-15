// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";
import { getCookies, setCookie } from "$std/http/cookie.ts";

export async function handler(
    req: Request,
    ctx: FreshContext,
) {
    const cookies = getCookies(req.headers);
    const sessionId = cookies.sessionId || crypto.randomUUID();


    // Set the session ID in state
    ctx.state = {
        ...ctx.state,
        sessionId,
    };

    const resp = await ctx.next();

    // Add session cookie to response
    setCookie(resp.headers, {
        name: "sessionId",
        value: sessionId,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24, // 24 hours
    });

    return resp;
}
