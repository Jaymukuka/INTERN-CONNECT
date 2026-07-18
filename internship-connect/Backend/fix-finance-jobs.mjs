import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log(
      "Searching for jobs that look finance-related but are not tagged as Finance..."
    );

    const detectQuery = `
      SELECT id, title, field_category, skills, keywords, description
      FROM jobs j
      WHERE NOT (j.field_category ILIKE '%finance%')
        AND (
          lower(coalesce(j.title, '')) LIKE '%account%'
          OR lower(coalesce(j.title, '')) LIKE '%finance%'
          OR lower(coalesce(j.title, '')) LIKE '%bookkeep%'
          OR lower(coalesce(j.title, '')) LIKE '%accounting%'
          OR lower(coalesce(j.title, '')) LIKE '%audit%'
          OR lower(coalesce(j.title, '')) LIKE '%bank%'
          OR lower(coalesce(j.title, '')) LIKE '%investment%'
          OR lower(coalesce(j.title, '')) LIKE '%ledger%'
          OR lower(coalesce(j.title, '')) LIKE '%financial%'
          OR lower(coalesce(j.description, '')) LIKE '%account%'
          OR lower(coalesce(j.description, '')) LIKE '%finance%'
          OR lower(coalesce(j.description, '')) LIKE '%accounting%'
          OR EXISTS (
            SELECT 1 FROM unnest(coalesce(j.skills, ARRAY[]::text[])) s WHERE lower(s) LIKE '%account%' OR lower(s) LIKE '%finance%' OR lower(s) LIKE '%bookkeep%' OR lower(s) LIKE '%accounting%'
          )
          OR EXISTS (
            SELECT 1 FROM unnest(coalesce(j.keywords, ARRAY[]::text[])) k WHERE lower(k) LIKE '%account%' OR lower(k) LIKE '%finance%' OR lower(k) LIKE '%bookkeep%' OR lower(k) LIKE '%accounting%'
          )
        )
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(detectQuery);

    if (rows.length === 0) {
      console.log("No mis-tagged finance jobs found.");
      process.exit(0);
    }

    console.log(`Found ${rows.length} job(s) to update:`);
    console.table(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        field_category: r.field_category,
      }))
    );

    const updated = [];
    for (const job of rows) {
      const upd = await pool.query(
        "UPDATE jobs SET field_category = $1 WHERE id = $2 RETURNING id, title, field_category",
        ["Finance", job.id]
      );
      updated.push(upd.rows[0]);
      console.log(`Updated job ${job.id} -> field_category='Finance'`);
    }

    console.log("Update complete. Jobs updated:");
    console.table(updated);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

run();
