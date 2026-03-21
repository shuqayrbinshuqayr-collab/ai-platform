import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Use DIRECT_URL (port 5432) for migrations — the pooler (port 6543) blocks DDL
const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
