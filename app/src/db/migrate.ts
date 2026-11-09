import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applySchema() {
  const sqlPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log(
    "[Schema] Applying the PostgreSQL 16 schema...",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("[Schema] Applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Schema Error]", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applySchema();
