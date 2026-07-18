import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import fs from "fs";
import path from "path";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
dotenv.config();
// ADMIN CREATION ENDPOINT (DEV)

const { Pool } = pkg;
const app = express();

// Middleware - FIXED CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `📨 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`
  );
  next();
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ensure uploads directory exists for storing resumes
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Multer setup for handling resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("✅ Connected to PostgreSQL database");
    release();
  }
});

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// ========== BASIC ROUTES ==========
app.get("/", (req, res) => {
  res.json({
    message: "Job Application System API",
    endpoints: {
      health: "/api/health",
      healthDetailed: "/api/health-detailed",
      setup: "/api/setup-database",
      register: "/api/register",
      login: "/api/login",
      jobs: "/api/jobs",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "Server is running!",
    timestamp: new Date().toISOString(),
  });
});

// HEALTH CHECK ENDPOINT
app.get("/api/health-detailed", async (req, res) => {
  try {
    // Test database connection and basic query
    const dbTest = await pool.query(
      "SELECT NOW() as time, version() as version"
    );
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    res.json({
      status: "healthy",
      database: {
        connected: true,
        time: dbTest.rows[0].time,
        version: dbTest.rows[0].version,
        tables: tablesCheck.rows.map((row) => row.table_name),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: {
        connected: false,
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Simple health check for recommendation query
app.get("/api/health/recommendations", async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      // Basic ping that the recommendations subsystem is available
      return res.json({
        ok: true,
        message: "Recommendations subsystem reachable (no studentId provided)",
      });
    }

    // Try to run the recommended query for the provided student id to verify it executes
    const studentResult = await pool.query(
      "SELECT profile FROM users WHERE id = $1",
      [studentId]
    );
    if (!studentResult.rows.length)
      return res.status(404).json({ ok: false, error: "Student not found" });

    const studentProfile = studentResult.rows[0].profile || {};
    const studentSkills = studentProfile.skills || [];
    const studentLocation = (studentProfile.location || "").toString();
    const studentExperience = studentProfile.experience_level || "";
    const studentDegree = (
      studentProfile.education?.degree ||
      studentProfile.degree ||
      ""
    ).toString();

    const testQuery = `
      SELECT j.id FROM jobs j
      WHERE j.status = 'active' OR j.status IS NULL
      LIMIT 1
    `;

    const testRes = await pool.query(testQuery);
    return res.json({
      ok: true,
      message: "Recommendations query executed",
      sampleJobsFound: testRes.rows.length,
    });
  } catch (error) {
    console.error("Recommendations health error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== DATABASE SETUP ROUTE ==========
app.get("/api/setup-database", async (req, res) => {
  console.log("🔧 Setting up database tables...");

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('student', 'organization', 'admin')) NOT NULL,
        profile JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table created");

    // Create jobs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        company VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        salary VARCHAR(100),
        skills TEXT[],
        description TEXT,
          experience_level VARCHAR(50),
          field_category VARCHAR(100),
        keywords TEXT[],
        requirements TEXT[],
        responsibilities TEXT[],
        posted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'active',
        posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      
    `);
    console.log("✅ Jobs table created");

    // Create applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        student_name VARCHAR(100) NOT NULL,
        student_email VARCHAR(100) NOT NULL,
        student_skills TEXT[],
        student_university VARCHAR(100),
        student_phone VARCHAR(50),
        student_location VARCHAR(100),
        student_degree VARCHAR(100),
        student_graduation_year VARCHAR(20),
        student_resume_url TEXT,
        student_portfolio_url TEXT,
        cover_letter TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'rejected')),
        applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, student_id)
      )
    `);
    console.log("✅ Applications table created");

    // Ensure new columns exist
    await pool.query(
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50) DEFAULT 'Entry Level'`
    );
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_phone VARCHAR(50)`
    );
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_location VARCHAR(100)`
    );
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_degree VARCHAR(100)`
    );
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_graduation_year VARCHAR(20)`
    );
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_resume_url TEXT`
    );
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_portfolio_url TEXT`
    );

    res.json({
      success: true,
      message: "Database setup completed successfully!",
      tables: ["users", "jobs", "applications"],
    });
  } catch (error) {
    console.error("❌ Database setup error:", error);
    res.status(500).json({
      success: false,
      error: "Database setup failed",
      details: error.message,
    });
  }
});

// ========== AUTH ROUTES ==========
app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      type,
      phone,
      location,
      university,
      degree,
      graduationYear,
      company,
      industry,
      size,
      description,
    } = req.body;

    console.log("🔐 Registration attempt:", { name, email, type });
    console.log("📦 Full request body:", req.body);

    // Check if user exists
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      console.log("❌ User already exists:", email);
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    console.log("🔒 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build profile based on user type
    let profile = {};
    if (type === "student") {
      profile = {
        phone: phone || "",
        location: location || "",
        education: {
          university: university || "",
          degree: degree || "",
          graduationYear: graduationYear || "",
        },
        skills: [],
        resume: "",
        projects: [],
      };
    } else if (type === "organization") {
      profile = {
        company: company || "",
        industry: industry || "",
        size: size || "",
        location: location || "",
        description: description || "",
      };
    }

    console.log("📝 Profile data:", JSON.stringify(profile, null, 2));

    // Insert user
    console.log("💾 Inserting user into database...");
    const result = await pool.query(
      `INSERT INTO users (name, email, password, type, profile) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, type, profile`,
      [name, email, hashedPassword, type, JSON.stringify(profile)]
    );

    const user = result.rows[0];
    console.log("✅ User created successfully:", user.email);

    // Generate token
    console.log("🎫 Generating JWT token...");
    const token = jwt.sign(
      { id: user.id, email: user.email, type: user.type },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" }
    );

    console.log("🎉 Registration completed successfully for:", user.email);

    res.status(201).json({
      message: "User created successfully",
      user,
      token,
    });
  } catch (error) {
    console.error("❌ REGISTRATION ERROR:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error details:", error);

    res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Check server logs for details",
    });
  }
});

// LOGIN ROUTE - ADDED
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", email);

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      console.log("❌ User not found:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check password
    console.log("🔒 Checking password...");
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("❌ Invalid password for:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate token
    console.log("🎫 Generating JWT token...");
    const token = jwt.sign(
      { id: user.id, email: user.email, type: user.type },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" }
    );

    console.log("✅ Login successful for:", user.email);

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        profile: user.profile,
      },
      token,
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Check server logs for details",
    });
  }
});

// ========== JOB ROUTES ==========
// FIXED: Get all active jobs (students should see all active jobs)
// Now includes recruiter profile details for company info display
app.get("/api/jobs", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.*, u.name as company_name, u.profile as recruiter_profile
      FROM jobs j 
      LEFT JOIN users u ON j.posted_by = u.id 
      WHERE j.status = 'active' OR j.status IS NULL
      ORDER BY j.posted_date DESC
    `);

    // Enrich job data with recruiter profile fields at the top level for easier access
    const enrichedJobs = result.rows.map((job) => ({
      ...job,
      company_description: job.recruiter_profile?.description || "",
      company_industry: job.recruiter_profile?.industry || "General",
      company_size: job.recruiter_profile?.size || "",
      company_location: job.recruiter_profile?.location || "",
    }));

    console.log(`📊 Returning ${enrichedJobs.length} jobs to client`);
    res.json(enrichedJobs);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Recommended jobs for the authenticated student (simple weighted matching)
app.get("/api/jobs/recommended", authenticateToken, async (req, res) => {
  try {
    // Only students should use this endpoint
    if (req.user.type !== "student") {
      return res
        .status(403)
        .json({ error: "Only students can request recommended jobs" });
    }

    // Get student profile (skills, location)
    const studentResult = await pool.query(
      "SELECT profile FROM users WHERE id = $1",
      [req.user.id]
    );
    const studentProfile = studentResult.rows[0]?.profile || {};
    const studentSkills = studentProfile.skills || [];
    const studentLocation = (studentProfile.location || "").toString();

    // Weighted scoring (reordered by priority):
    // 1. Education Field match: weight 30 (HIGHEST PRIORITY)
    // 2. Skill matches: weight 20 per matched skill
    // 3. Experience level exact match: weight 20 (THIRD PRIORITY)
    // 4. Location match (contains): weight 10 (LOWEST PRIORITY)
    // Max realistic score: 30 (field) + 20*N (skills) + 20 (experience) + 10 (location)
    // These weights ensure percentages scale 0-100 realistically

    const query = `
      SELECT j.*,
        (
          (CASE WHEN $4 <> '' AND j.field_category IS NOT NULL AND (lower(j.field_category) LIKE ('%' || lower($4) || '%') OR lower($4) LIKE ('%' || lower(j.field_category) || '%')) THEN 30 ELSE 0 END)
          + (SELECT COUNT(*) FROM unnest(COALESCE(j.skills, ARRAY[]::text[])) AS s WHERE s = ANY($1::text[])) * 20
          + (CASE WHEN $3 IS NOT NULL AND j.experience_level IS NOT NULL AND lower(j.experience_level) = lower($3) THEN 20 ELSE 0 END)
          + (CASE WHEN $2 <> '' AND j.location ILIKE ('%' || $2 || '%') THEN 10 ELSE 0 END)
        ) AS match_score
      FROM jobs j
      WHERE j.status = 'active' OR j.status IS NULL
      ORDER BY match_score DESC NULLS LAST, j.posted_date DESC
      LIMIT 200
    `;

    const studentExperience = studentProfile.experience_level || "";
    const studentDegree = (
      studentProfile.education?.degree ||
      studentProfile.degree ||
      ""
    ).toString();

    const result = await pool.query(query, [
      studentSkills,
      studentLocation,
      studentExperience,
      studentDegree,
    ]);

    // Map degree to field category for better matching
    // Finance-related degrees: accounting, finance, economics, business, commerce
    const financeKeywords = [
      "account",
      "finance",
      "economics",
      "business",
      "commerce",
      "audit",
      "tax",
      "banking",
    ];
    const isFinanceStudent = financeKeywords.some((kw) =>
      studentDegree.toLowerCase().includes(kw)
    );

    // Technology-related degrees: computer science, engineering, IT, software, data science
    const techKeywords = [
      "computer",
      "engineer",
      "software",
      "data",
      "it ",
      "programming",
      "information technology",
      "tech",
    ];
    const isTechStudent = techKeywords.some((kw) =>
      studentDegree.toLowerCase().includes(kw)
    );

    // Boost scores for jobs matching student field and compute a per-job percentage
    // New weights: field (30), skill per match (20), experience (20), location (10)
    const enhancedJobs = result.rows.map((job) => {
      const rawBase = Number(job.match_score || 0);

      // Calculate score components for percentage
      const skillCount = Array.isArray(job.skills) ? job.skills.length : 0;

      // Max possible score if student matched EVERYTHING:
      // field (30) + all skills (skillCount * 20) + experience (20) + location (10)
      const maxPossibleRaw =
        /* field match */ 30 +
        /* all skills match */ skillCount * 20 +
        /* experience match */ 20 +
        /* location match */ 10;

      // Bonus boost for field match on top of the base score
      let boostedScore = rawBase;
      if (isFinanceStudent && job.field_category?.toLowerCase() === "finance") {
        boostedScore += 10; // Extra boost for matching field
      } else if (
        isTechStudent &&
        job.field_category?.toLowerCase() === "technology"
      ) {
        boostedScore += 10; // Extra boost for matching field
      }

      // Convert to 0-100% where 100% = maxPossibleRaw + boost
      const maxWithBoosts = maxPossibleRaw + 10; // +10 for field boost
      const pct =
        maxWithBoosts > 0
          ? Math.min(100, Math.round((boostedScore / maxWithBoosts) * 100))
          : 0;

      // Provide both raw and percentage for clarity; frontend prefers `match_score`.
      return {
        ...job,
        match_score: pct,
        raw_match_score: boostedScore,
        match_score_max: maxWithBoosts,
      };
    });

    // Re-sort by percentage score (descending)
    enhancedJobs.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    // Enrich with recruiter profile fields for frontend company info display
    const enrichedWithRecruiter = enhancedJobs.map((job) => ({
      ...job,
      company_description: job.recruiter_profile?.description || "",
      company_industry:
        job.recruiter_profile?.industry || job.field_category || "General",
      company_size: job.recruiter_profile?.size || "",
      company_location: job.recruiter_profile?.location || "",
    }));

    res.json({ jobs: enrichedWithRecruiter });
  } catch (error) {
    console.error("Get recommended jobs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// FIXED: Job creation with proper response
app.post("/api/jobs", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      type,
      location,
      salary,
      skills,
      description,
      requirements,
      responsibilities,
      experience_level,
      field_category,
      keywords,
    } = req.body;

    if (req.user.type !== "organization") {
      return res.status(403).json({ error: "Only recruiters can post jobs" });
    }

    // Get company info from user profile
    const userResult = await pool.query(
      "SELECT profile FROM users WHERE id = $1",
      [req.user.id]
    );

    const company = userResult.rows[0].profile?.company || req.user.name;

    console.log("💼 Creating new job:", { title, company, location, type });

    const result = await pool.query(
      `INSERT INTO jobs (title, company, location, type, salary, skills, description, requirements, responsibilities, posted_by, experience_level, field_category, keywords) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING *`,
      [
        title,
        company,
        location,
        type,
        salary,
        skills,
        description,
        requirements,
        responsibilities,
        req.user.id,
        experience_level,
        field_category,
        keywords,
      ]
    );

    // FIXED: Return the complete job object with all fields
    const newJob = result.rows[0];
    console.log("✅ Job created successfully:", newJob.id);

    res.status(201).json({
      message: "Job posted successfully",
      job: newJob,
    });
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT j.*, u.name as company_name 
      FROM jobs j 
      LEFT JOIN users u ON j.posted_by = u.id 
      WHERE j.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get job by ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== APPLICATION ROUTES ==========
app.post("/api/applications", authenticateToken, async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;
    const studentId = req.user.id;

    console.log("📦 Application data:", {
      jobId,
      studentId,
      userType: req.user.type,
    });

    if (req.user.type !== "student") {
      console.log("❌ User is not student, type is:", req.user.type);
      return res
        .status(403)
        .json({ error: "Only students can apply for jobs" });
    }

    // Check if already applied
    const existingApp = await pool.query(
      "SELECT id, status FROM applications WHERE job_id = $1 AND student_id = $2",
      [jobId, studentId]
    );

    if (existingApp.rows.length > 0) {
      return res.status(400).json({
        error: `Already applied to this job. Current status: ${existingApp.rows[0].status}`,
      });
    }

    // Get student info
    const student = await pool.query(
      "SELECT name, email, profile FROM users WHERE id = $1",
      [studentId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentData = student.rows[0];
    const studentSkills = studentData.profile?.skills || [];
    const studentUniversity = studentData.profile?.education?.university || "";
    const studentPhone = studentData.profile?.phone || "";
    const studentLocation = studentData.profile?.location || "";
    const studentDegree = studentData.profile?.education?.degree || "";
    const studentGraduationYear =
      studentData.profile?.education?.graduationYear || "";
    const studentResumeUrl =
      studentData.profile?.resumeUrl || studentData.profile?.resume || null;
    const studentPortfolioUrl = studentData.profile?.portfolioUrl || null;

    // Create application
    const result = await pool.query(
      `INSERT INTO applications (
         job_id, student_id, student_name, student_email, student_skills, student_university,
         student_phone, student_location, student_degree, student_graduation_year,
         student_resume_url, student_portfolio_url, cover_letter
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        jobId,
        studentId,
        studentData.name,
        studentData.email,
        studentSkills,
        studentUniversity,
        studentPhone,
        studentLocation,
        studentDegree,
        studentGraduationYear,
        studentResumeUrl,
        studentPortfolioUrl,
        coverLetter,
      ]
    );

    console.log("✅ Application created successfully:", result.rows[0].id);

    res.status(201).json({
      message: "Application submitted successfully",
      application: result.rows[0],
    });
  } catch (error) {
    console.error("Apply error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/applications/student", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "student") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `
      SELECT a.*, j.title as job_title, j.company, j.location, j.type
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.student_id = $1
      ORDER BY a.applied_date DESC
    `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get student applications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/applications/recruiter", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "organization") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `
      SELECT a.*, j.title as job_title, j.company
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.posted_by = $1
      ORDER BY a.applied_date DESC
    `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get recruiter applications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get ranked applicants for a specific job (recruiter only) based on skills overlap
app.get(
  "/api/applications/recruiter/:jobId/ranked",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.type !== "organization") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { jobId } = req.params;

      // Verify recruiter owns this job
      const jobCheck = await pool.query("SELECT * FROM jobs WHERE id = $1", [
        jobId,
      ]);
      if (jobCheck.rows.length === 0)
        return res.status(404).json({ error: "Job not found" });
      if (jobCheck.rows[0].posted_by !== req.user.id)
        return res.status(403).json({ error: "Not authorized for this job" });

      // Rank applicants by counting skill overlaps between job.skills and applicant.student_skills
      const rankQuery = `
      SELECT a.*,
        (
          (SELECT COUNT(*) FROM unnest(COALESCE(j.skills, ARRAY[]::text[])) AS js WHERE js = ANY(COALESCE(a.student_skills, ARRAY[]::text[])))
        ) AS skill_match_count
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.job_id = $1
      ORDER BY skill_match_count DESC, a.applied_date DESC
      LIMIT 500
    `;

      const result = await pool.query(rankQuery, [jobId]);
      res.json({ applications: result.rows });
    } catch (error) {
      console.error("Get ranked applicants error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.put("/api/applications/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.type !== "organization") {
      return res
        .status(403)
        .json({ error: "Only recruiters can update application status" });
    }

    // Verify recruiter owns this job
    const application = await pool.query(
      `
      SELECT a.*, j.posted_by 
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `,
      [id]
    );

    if (application.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.rows[0].posted_by !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this application" });
    }

    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    res.json({
      message: "Application status updated",
      application: result.rows[0],
    });
  } catch (error) {
    console.error("Update application status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== USER PROFILE ROUTES ==========
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const { profile } = req.body;

    const result = await pool.query(
      "UPDATE users SET profile = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, type, profile",
      [profile, req.user.id]
    );

    res.json({
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upload resume endpoint - authenticated students only
app.post(
  "/api/users/upload-resume",
  authenticateToken,
  upload.single("resume"),
  async (req, res) => {
    try {
      if (req.user.type !== "student") {
        return res.status(403).json({ error: "Only students can upload resumes" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const resumeUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

      // Update user's profile with resume URL and name
      const userRes = await pool.query("SELECT profile FROM users WHERE id = $1", [req.user.id]);
      const existingProfile = userRes.rows[0]?.profile || {};
      const updatedProfile = {
        ...existingProfile,
        resumeUrl,
        resumeName: req.file.originalname,
      };

      await pool.query(
        "UPDATE users SET profile = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [updatedProfile, req.user.id]
      );

      // Propagate resume URL to any existing applications by this student
      await pool.query(
        "UPDATE applications SET student_resume_url = $1 WHERE student_id = $2",
        [resumeUrl, req.user.id]
      );

      res.json({ message: "Resume uploaded successfully", resumeUrl });
    } catch (error) {
      console.error("Upload resume error:", error);
      res.status(500).json({ error: "Failed to upload resume" });
    }
  }
);

// ========== ADMIN ROUTES ==========

// Get system statistics (admin only)
app.get("/api/admin/stats", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get user counts by type
    const userStats = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM users 
      GROUP BY type
    `);

    // Get job stats
    const jobStats = await pool.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status != 'active' OR status IS NULL THEN 1 END) as inactive_jobs
      FROM jobs
    `);

    // Get application stats
    const applicationStats = await pool.query(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
        COUNT(CASE WHEN status = 'shortlisted' THEN 1 END) as shortlisted_applications,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications
      FROM applications
    `);

    // Get recent activity
    const recentUsers = await pool.query(`
      SELECT COUNT(*) as recent_users 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    const recentJobs = await pool.query(`
      SELECT COUNT(*) as recent_jobs 
      FROM jobs 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    res.json({
      users: userStats.rows,
      jobs: jobStats.rows[0],
      applications: applicationStats.rows[0],
      recent: {
        users: recentUsers.rows[0].recent_users,
        jobs: recentJobs.rows[0].recent_jobs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (admin only)
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await pool.query(`
      SELECT id, name, email, type, profile, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all jobs (admin only)
app.get("/api/admin/jobs", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await pool.query(`
      SELECT j.*, u.name as poster_name, u.email as poster_email
      FROM jobs j 
      LEFT JOIN users u ON j.posted_by = u.id 
      ORDER BY j.posted_date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Get admin jobs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all applications (admin only)
app.get("/api/admin/applications", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await pool.query(`
      SELECT a.*, j.title as job_title, j.company, 
             u.name as student_name, u.email as student_email,
             recruiter.name as recruiter_name, recruiter.email as recruiter_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.student_id = u.id
      LEFT JOIN users recruiter ON j.posted_by = recruiter.id
      ORDER BY a.applied_date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Get admin applications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a user (admin only)
app.delete("/api/admin/users/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Admin deleted user:", id);

    res.json({
      message: "User deleted successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a job (admin only)
app.delete("/api/admin/jobs/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    console.log("Admin deleted job:", id);

    res.json({
      message: "Job deleted successfully",
      job: result.rows[0],
    });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user (admin only)
app.put("/api/admin/users/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { name, email, type, profile } = req.body;

    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, type = $3, profile = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, name, email, type, profile, created_at, updated_at",
      [name, email, type, profile, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update application status (admin only)
app.put("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({
      message: "Application status updated",
      application: result.rows[0],
    });
  } catch (error) {
    console.error("Update application error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TEMP: Seed example jobs (development helper) - creates two sample jobs
// Note: This route is intentionally unprotected for local development only.
app.get("/api/_seed-jobs", async (req, res) => {
  try {
    const sampleJobs = [
      {
        title: "Frontend Intern",
        company: "Example Corp",
        location: "remote",
        type: "Internship",
        salary: "ZK 1,500",
        skills: ["html", "css", "javascript"],
        description: "Work with the frontend team to build interfaces",
        requirements: ["HTML/CSS", "Basic JS"],
        responsibilities: ["Implement UI", "Fix bugs"],
        experience_level: "Entry Level",
        field_category: "Software Development",
        keywords: ["frontend", "internship"],
      },
      {
        title: "Data Science Intern",
        company: "DataWorks",
        location: "Lusaka",
        type: "Internship",
        salary: "ZK 2,000",
        skills: ["python", "pandas", "ml"],
        description: "Assist in building data models",
        requirements: ["Python basics"],
        responsibilities: ["Data cleaning", "Model evaluation"],
        experience_level: "Entry Level",
        field_category: "Data Science & Analytics",
        keywords: ["data", "intern"],
      },
    ];

    const inserted = [];
    for (const j of sampleJobs) {
      const result = await pool.query(
        `INSERT INTO jobs (title, company, location, type, salary, skills, description, requirements, responsibilities, posted_by, experience_level, field_category, keywords)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          j.title,
          j.company,
          j.location,
          j.type,
          j.salary,
          j.skills,
          j.description,
          j.requirements,
          j.responsibilities,
          null,
          j.experience_level,
          j.field_category,
          j.keywords,
        ]
      );
      inserted.push(result.rows[0]);
    }

    res.json({ success: true, inserted });
  } catch (error) {
    console.error("Seed jobs error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEV: Seed users and sample data for development/testing
// Creates a finance recruiter and two finance students (accounts/business programs)
// Returns cleartext passwords for convenience in local development only.
app.get("/api/_seed-users", async (req, res) => {
  try {
    const created = [];

    // Recruiter (Finance)
    const recruiterEmail = "recruiter_finance@example.com";
    const recruiterPassword = "FinanceRecruiter123!";

    // Upsert recruiter: if exists update password/profile, else insert
    const recruiterExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [recruiterEmail]
    );
    const hashedRec = await bcrypt.hash(recruiterPassword, 10);
    const recruiterProfile = {
      company: "FinanceCorp",
      industry: "Finance",
      size: "51-200 employees",
      location: "Lusaka",
      description: "Recruiters for finance internships and entry-level roles.",
    };

    if (recruiterExists.rows.length === 0) {
      const r = await pool.query(
        `INSERT INTO users (name, email, password, type, profile) VALUES ($1,$2,$3,$4,$5) RETURNING id, email`,
        [
          "Finance Recruiter",
          recruiterEmail,
          hashedRec,
          "organization",
          JSON.stringify(recruiterProfile),
        ]
      );
      created.push({
        role: "recruiter",
        email: recruiterEmail,
        password: recruiterPassword,
      });
    } else {
      // Update password and profile so we can guarantee credentials
      await pool.query(
        "UPDATE users SET password = $1, profile = $2 WHERE email = $3",
        [hashedRec, JSON.stringify(recruiterProfile), recruiterEmail]
      );
      created.push({
        role: "recruiter",
        email: recruiterEmail,
        password: recruiterPassword,
        note: "updated existing user",
      });
    }

    // Student 1 - Accounts program
    const student1Email = "student_accounts@example.com";
    const student1Password = "StudentAccounts123!";
    const hashedS1 = await bcrypt.hash(student1Password, 10);
    const student1Profile = {
      phone: "+260 97 000 0001",
      location: "Lusaka",
      education: {
        university: "Zambia School of Business",
        degree: "Accounts",
        graduationYear: "2026",
      },
      skills: ["accounting", "excel", "bookkeeping"],
      resumeUrl: null,
      portfolioUrl: null,
    };

    const s1Exists = await pool.query("SELECT id FROM users WHERE email = $1", [
      student1Email,
    ]);
    if (s1Exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, password, type, profile) VALUES ($1,$2,$3,$4,$5)`,
        [
          "Accounts Student",
          student1Email,
          hashedS1,
          "student",
          JSON.stringify(student1Profile),
        ]
      );
      created.push({
        role: "student",
        email: student1Email,
        password: student1Password,
      });
    } else {
      await pool.query(
        "UPDATE users SET password = $1, profile = $2 WHERE email = $3",
        [hashedS1, JSON.stringify(student1Profile), student1Email]
      );
      created.push({
        role: "student",
        email: student1Email,
        password: student1Password,
        note: "updated existing user",
      });
    }

    // Student 2 - Business Management program
    const student2Email = "student_business@example.com";
    const student2Password = "StudentBusiness123!";
    const hashedS2 = await bcrypt.hash(student2Password, 10);
    const student2Profile = {
      phone: "+260 97 000 0002",
      location: "Lusaka",
      education: {
        university: "Zambia Business College",
        degree: "Business Management",
        graduationYear: "2025",
      },
      skills: ["management", "communication", "excel"],
      resumeUrl: null,
      portfolioUrl: null,
    };

    const s2Exists = await pool.query("SELECT id FROM users WHERE email = $1", [
      student2Email,
    ]);
    if (s2Exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, password, type, profile) VALUES ($1,$2,$3,$4,$5)`,
        [
          "Business Student",
          student2Email,
          hashedS2,
          "student",
          JSON.stringify(student2Profile),
        ]
      );
      created.push({
        role: "student",
        email: student2Email,
        password: student2Password,
      });
    } else {
      await pool.query(
        "UPDATE users SET password = $1, profile = $2 WHERE email = $3",
        [hashedS2, JSON.stringify(student2Profile), student2Email]
      );
      created.push({
        role: "student",
        email: student2Email,
        password: student2Password,
        note: "updated existing user",
      });
    }

    res.json({ success: true, created });
  } catch (error) {
    console.error("Seed users error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEV: Seed jobs for current recruiters
// Creates 2 finance jobs for finance recruiter and 2 tech jobs for tech recruiter
app.get("/api/_seed-finance-jobs", async (req, res) => {
  try {
    console.log("🔧 Clearing old jobs and seeding new jobs...");

    // Delete all existing jobs
    await pool.query("DELETE FROM jobs");
    console.log("✅ Deleted all existing jobs");

    // Get all recruiters (users with type = 'organization')
    const recruitersResult = await pool.query(
      "SELECT id, name, profile FROM users WHERE type = 'organization' ORDER BY id ASC"
    );
    const recruiters = recruitersResult.rows;

    if (recruiters.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No recruiters found in database. Create recruiters first.",
      });
    }

    const created = [];

    // Create jobs based on recruiter industry
    for (let i = 0; i < recruiters.length; i++) {
      const recruiter = recruiters[i];
      const recruiterName = recruiter.name || `Recruiter ${recruiter.id}`;
      const profile = recruiter.profile || {};
      const industry = (profile.industry || "").toLowerCase();

      if (industry.includes("finance")) {
        // Finance jobs for finance recruiters
        const financeJob1 = {
          title: "Financial Analyst Intern",
          company: recruiterName,
          location: "Lusaka",
          type: "Internship",
          salary: "ZK 2,500/month",
          skills: ["Financial Analysis", "Excel", "Data Analysis"],
          description:
            "Join our finance team to analyze financial statements and market trends. You'll work on real-world projects analyzing company performance and providing insights.",
          requirements: [
            "Strong analytical skills",
            "Proficiency in Excel",
            "Understanding of financial statements",
          ],
          responsibilities: [
            "Analyze financial data and reports",
            "Create financial models and forecasts",
            "Prepare presentations for management",
          ],
          experience_level: "Entry Level",
          field_category: "Finance",
          keywords: ["finance", "analysis", "excel", "internship"],
          posted_by: recruiter.id,
        };

        const financeJob2 = {
          title: "Accounting Intern",
          company: recruiterName,
          location: "Remote",
          type: "Internship",
          salary: "ZK 2,200/month",
          skills: ["Bookkeeping", "Accounting Software", "Financial Reporting"],
          description:
            "Support our accounting department in maintaining accurate financial records and preparing financial statements. Great opportunity to learn accounting practices.",
          requirements: [
            "Attention to detail",
            "Knowledge of accounting principles",
            "Proficiency in accounting software",
          ],
          responsibilities: [
            "Record transactions in accounting system",
            "Reconcile accounts and check for discrepancies",
            "Assist in month-end closing process",
          ],
          experience_level: "Entry Level",
          field_category: "Finance",
          keywords: ["accounting", "finance", "bookkeeping", "internship"],
          posted_by: recruiter.id,
        };

        for (const job of [financeJob1, financeJob2]) {
          const result = await pool.query(
            `INSERT INTO jobs (title, company, location, type, salary, skills, description, requirements, responsibilities, posted_by, experience_level, field_category, keywords)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, title, company, posted_by`,
            [
              job.title,
              job.company,
              job.location,
              job.type,
              job.salary,
              job.skills,
              job.description,
              job.requirements,
              job.responsibilities,
              job.posted_by,
              job.experience_level,
              job.field_category,
              job.keywords,
            ]
          );
          created.push(result.rows[0]);
        }
      } else {
        // Tech jobs for tech recruiters
        const techJob1 = {
          title: "Frontend Developer Intern",
          company: recruiterName,
          location: "Lusaka",
          type: "Internship",
          salary: "ZK 2,800/month",
          skills: ["React", "JavaScript", "CSS", "HTML"],
          description:
            "Build responsive web interfaces with our frontend team. Work on modern React applications and collaborate with designers to create amazing user experiences.",
          requirements: [
            "JavaScript fundamentals",
            "React basics",
            "CSS knowledge",
          ],
          responsibilities: [
            "Build React components",
            "Implement UI designs",
            "Debug and optimize code",
          ],
          experience_level: "Entry Level",
          field_category: "Technology",
          keywords: ["frontend", "react", "javascript", "internship"],
          posted_by: recruiter.id,
        };

        const techJob2 = {
          title: "Backend Developer Intern",
          company: recruiterName,
          location: "Remote",
          type: "Internship",
          salary: "ZK 2,600/month",
          skills: ["Node.js", "Python", "SQL", "REST APIs"],
          description:
            "Develop and maintain backend services. Work with databases, APIs, and server infrastructure while learning best practices in backend development.",
          requirements: [
            "Knowledge of programming language (Python/JavaScript)",
            "SQL basics",
            "Understanding of REST APIs",
          ],
          responsibilities: [
            "Develop backend features",
            "Write and maintain SQL queries",
            "Participate in code reviews",
          ],
          experience_level: "Entry Level",
          field_category: "Technology",
          keywords: ["backend", "node.js", "python", "internship"],
          posted_by: recruiter.id,
        };

        for (const job of [techJob1, techJob2]) {
          const result = await pool.query(
            `INSERT INTO jobs (title, company, location, type, salary, skills, description, requirements, responsibilities, posted_by, experience_level, field_category, keywords)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, title, company, posted_by`,
            [
              job.title,
              job.company,
              job.location,
              job.type,
              job.salary,
              job.skills,
              job.description,
              job.requirements,
              job.responsibilities,
              job.posted_by,
              job.experience_level,
              job.field_category,
              job.keywords,
            ]
          );
          created.push(result.rows[0]);
        }
      }
    }

    console.log(`✅ Created ${created.length} jobs`);
    res.json({
      success: true,
      created,
      message: `Created ${created.length} jobs`,
    });
  } catch (error) {
    console.error("Seed jobs error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 404 HANDLER ==========
app.use("*", (req, res) => {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      root: "GET /",
      health: "GET /api/health",
      healthDetailed: "GET /api/health-detailed",
      setup: "GET /api/setup-database",
      register: "POST /api/register",
      login: "POST /api/login",
      jobs: "GET /api/jobs, POST /api/jobs",
      applications:
        "POST /api/applications, GET /api/applications/student, GET /api/applications/recruiter",
    },
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Root: http://localhost:${PORT}/`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(
    `🔍 Detailed Health: http://localhost:${PORT}/api/health-detailed`
  );
  console.log(`🗄️  Setup: http://localhost:${PORT}/api/setup-database`);
});
