import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      `SELECT id, name, type, profile FROM users WHERE type = 'student' LIMIT 3`
    );
    console.log("Student profiles:");
    res.rows.forEach((row) => {
      console.log(`\n${row.name} (ID: ${row.id}):`);
      console.log(JSON.stringify(row.profile, null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

run();
