/** Serves the built website (apps/web/out) on http://localhost:4173 */
import path from "node:path";
import { serve } from "./lib-static";

const { url } = await serve(path.resolve(import.meta.dirname, "../apps/web/out"), Number(process.env.PORT ?? 4173));
console.log(`Windchill Mastery preview: ${url}`);
