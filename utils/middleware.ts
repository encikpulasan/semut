// utils/middleware.ts
import { FreshContext } from "$fresh/server.ts";
import { getCookies, setCookie } from "$std/http/cookie.ts";

export async function sessionMiddleware(
    req: Request,
    ctx: FreshContext,
) {
    // Get existing session ID from cookie
    const cookies = getCookies(req.headers);
    let sessionId = cookies.sessionId;

    // Generate new session ID if none exists
    if (!sessionId) {
        const buffer = new Uint8Array(16);
        crypto.getRandomValues(buffer);
        sessionId = Array.from(buffer)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    // Add session ID to context
    ctx.state.sessionId = sessionId;

    // Get response from next handler
    const response = await ctx.next();

    // Set session cookie
    setCookie(response.headers, {
        name: "sessionId",
        value: sessionId,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
}
