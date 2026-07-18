import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log("Querying recruiters who posted Finance jobs...");
    const res = await pool.query(`
      SELECT DISTINCT j.posted_by AS recruiter_id
      FROM jobs j
      WHERE lower(j.field_category) LIKE '%finance%'
    `);

    if (res.rows.length === 0) {
      console.log("No finance jobs found. Nothing to update.");
      process.exit(0);
    }

    const recruiters = res.rows.map((r) => r.recruiter_id);
    console.log("Recruiter IDs posting finance jobs:", recruiters);

    const updated = [];

    for (const id of recruiters) {
      const u = await pool.query(
        "SELECT id, name, profile FROM users WHERE id = $1",
        [id]
      );
      if (u.rows.length === 0) continue;
      const user = u.rows[0];
      const profile = user.profile || {};
      const currentIndustry = (profile.industry || "").toString();

      if (!currentIndustry.toLowerCase().includes("finance")) {
        profile.industry = "Finance";
        await pool.query("UPDATE users SET profile = $1 WHERE id = $2", [
          JSON.stringify(profile),
          id,
        ]);
        updated.push({
          id: user.id,
          name: user.name,
          previousIndustry: currentIndustry || "(empty)",
        });
        console.log(
          `Updated user ${user.id} (${user.name}) industry: "${currentIndustry}" -> "Finance"`
        );
      } else {
        console.log(
          `User ${user.id} (${user.name}) already has industry="${currentIndustry}"`
        );
      }
    }

    console.log("Update complete. Total updated:", updated.length);
    if (updated.length > 0)
      console.log("Updated users:", JSON.stringify(updated, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error while updating recruiters:", err.message || err);
    process.exit(1);
  }
}

run();
