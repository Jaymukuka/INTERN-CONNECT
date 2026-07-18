import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const { Pool } = pkg;
const app = express();

// Middleware - FIXED CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`)
  next()
})

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// All routes from original server.js...
// [Previous routes omitted for brevity]

// Use environment PORT when provided so this file won't silently break workflows
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Root: http://localhost:${PORT}/`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Detailed Health: http://localhost:${PORT}/api/health-detailed`);
  console.log(`🗄️  Setup: http://localhost:${PORT}/api/setup-database`);
});

// TEMP: Seed example jobs (development helper) - creates two sample jobs
// Note: This route is intentionally unprotected for local development only.
app.get('/api/_seed-jobs', async (req, res) => {
  try {
    const sampleJobs = [
      {
        title: 'Frontend Intern',
        company: 'Example Corp',
        location: 'remote',
        type: 'Internship',
        salary: 'ZK 1,500',
        skills: ['html', 'css', 'javascript'],
        description: 'Work with the frontend team to build interfaces',
        requirements: ['HTML/CSS', 'Basic JS'],
        responsibilities: ['Implement UI', 'Fix bugs'],
        experience_level: 'Entry Level',
        field_category: 'Software Development',
        keywords: ['frontend','internship']
      },
      {
        title: 'Data Science Intern',
        company: 'DataWorks',
        location: 'Lusaka',
        type: 'Internship',
        salary: 'ZK 2,000',
        skills: ['python', 'pandas', 'ml'],
        description: 'Assist in building data models',
        requirements: ['Python basics'],
        responsibilities: ['Data cleaning', 'Model evaluation'],
        experience_level: 'Entry Level',
        field_category: 'Data Science & Analytics',
        keywords: ['data','intern']
      }
    ];

    const inserted = [];
    for (const j of sampleJobs) {
      const result = await pool.query(
        `INSERT INTO jobs (title, company, location, type, salary, skills, description, requirements, responsibilities, posted_by, experience_level, field_category, keywords)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [j.title, j.company, j.location, j.type, j.salary, j.skills, j.description, j.requirements, j.responsibilities, null, j.experience_level, j.field_category, j.keywords]
      );
      inserted.push(result.rows[0]);
    }

    res.json({ success: true, inserted });
  } catch (error) {
    console.error('Seed jobs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});