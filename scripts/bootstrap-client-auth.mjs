#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

const seedOnly = process.argv.includes("--seed-only");

if (!databaseUrl) {
  console.error(
    "Missing database connection string. Set SUPABASE_DB_URL or DATABASE_URL."
  );
  process.exit(1);
}

const sqlFile = seedOnly
  ? "seed_cenomi_store_managers.sql"
  : "apply_client_auth.sql";

const sql = readFileSync(join(process.cwd(), "supabase", sqlFile), "utf8");

async function main() {
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: databaseUrl });

  await client.connect();
  await client.query(sql);

  const { rows: users } = await client.query(
    `select
       cu.username,
       cu.access_level,
       cu.active,
       coalesce(
         (
           select string_agg(distinct s.store_name, ', ' order by s.store_name)
           from public.stores s
           where s.id in (
             select jsonb_array_elements_text(cu.store_ids)::bigint
           )
         ),
         case when cu.access_level = 'company' then 'ALL Cenomi stores' else '' end
       ) as stores
     from public.client_users cu
     join public.client_portals cp on cp.id = cu.client_portal_id
     where lower(cp.slug) = 'cenomi'
       and cu.active = true
     order by cu.username`
  );

  console.log(`Applied ${sqlFile}`);
  console.log("Active Cenomi client users:");
  for (const user of users) {
    console.log(
      `- ${user.username} (${user.access_level}) -> ${user.stores || "none"}`
    );
  }

  await client.end();
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
