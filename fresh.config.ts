import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import { sessionMiddleware } from "./utils/middleware.ts";

export default defineConfig({
  plugins: [tailwind()],
  middleware: [sessionMiddleware],
});
