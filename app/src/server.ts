import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

const server = http.createServer(app);
server.listen(env.PORT, "0.0.0.0", () =>
  console.log(`[FTD backend] Listening on http://0.0.0.0:${env.PORT}`),
);

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`[FTD backend] ${signal}; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
