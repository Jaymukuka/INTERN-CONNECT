import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      "SELECT id, name, profile FROM users WHERE type = 'organization' ORDER BY id"
    );
    console.log("Recruiters:");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

run();
