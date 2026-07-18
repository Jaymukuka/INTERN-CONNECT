import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const adminEmail = "admin@internshipconnect.com";
    const adminPassword = "Admin@123";
    const adminName = "Administrator";

    console.log("Checking for existing admin...");
    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [
      adminEmail,
    ]);
    if (exists.rows.length > 0) {
      console.log("Admin already exists with id:", exists.rows[0].id);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    const profile = {
      role: "admin",
      permissions: [
        "manage_users",
        "manage_jobs",
        "manage_applications",
        "view_analytics",
      ],
      created_at: new Date().toISOString(),
    };

    const res = await pool.query(
      `INSERT INTO users (name, email, password, type, profile) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [adminName, adminEmail, hashed, "admin", JSON.stringify(profile)]
    );

    console.log("Admin created with id:", res.rows[0].id);
    console.log("Credentials:");
    console.log("  email:", adminEmail);
    console.log("  password:", adminPassword);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err.message || err);
    process.exit(1);
  }
}

run();
