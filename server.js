const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

// Load environment variables from .env file
dotenv.config();

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: "localhost",
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const app = express();
const saltRounds = 10;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serves frontend HTML files out of the 'public' folder

/**
 * 📝 USER REGISTRATION ENDPOINT
 */
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await pool.query(
            "INSERT INTO users(name, email, password) VALUES($1, $2, $3)",
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: "User Registered Successfully" });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: "This email address is already registered." });
        }
        console.error("System Registration Error:", error);
        res.status(500).json({ message: "Registration Failed due to a server error." });
    }
});

/**
 * 🔑 USER LOGIN ENDPOINT
 */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = userResult.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({ 
            message: "Login successful!",
            user: { id: user.id, name: user.name, email: user.email } 
        });
    } catch (error) {
        console.error("System Login Error:", error);
        res.status(500).json({ message: "An unexpected error occurred during login." });
    }
});

/**
 * 📊 ADMIN: FETCH REGISTERED STUDENTS INDEX
 */
app.get("/api/admin/students", async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email FROM users ORDER BY id DESC");
        res.json(result.rows);
    } catch (error) {
        console.error("Admin Fetch Error:", error);
        res.status(500).json({ message: "Failed to retrieve student records." });
    }
});

/**
 * 💼 ADMIN: POST A NEW INTERNSHIP TRACK
 */
app.post("/api/internships", async (req, res) => {
    const { company, role, location, stipend, duration } = req.body;

    if (!company || !role || !location || !stipend || !duration) {
        return res.status(400).json({ message: "All internship fields are required." });
    }

    try {
        await pool.query(
            "INSERT INTO internships (company, role, location, stipend, duration) VALUES ($1, $2, $3, $4, $5)",
            [company, role, location, stipend, duration]
        );
        res.status(201).json({ message: "Internship Posted Successfully!" });
    } catch (error) {
        console.error("Error posting internship:", error);
        res.status(500).json({ message: "Failed to post internship to database." });
    }
});

/**
 * 🎓 STUDENT/ADMIN: FETCH ALL INTERNSHIPS
 */
app.get("/api/internships", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM internships ORDER BY id DESC");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching internships:", error);
        res.status(500).json({ message: "Failed to fetch internships from server." });
    }
});

/**
 * 📩 STUDENT: SUBMIT APPLICATION PIPELINE ROUTE
 */
app.post("/api/applications/apply", async (req, res) => {
    const { student_id, student_name, job_title } = req.body;
    try {
        await pool.query(
            "INSERT INTO applications (student_id, student_name, job_title) VALUES ($1, $2, $3)",
            [student_id, student_name, job_title]
        );
        res.status(201).json({ message: "Application submitted successfully to database!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to apply." });
    }
});

/**
 * 📊 ADMIN: FETCH ALL SUBMITTED APPLICATIONS
 */
app.get("/api/applications/admin-view", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM applications ORDER BY id DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: "Error fetching applications map rows." });
    }
});

/**
 * 📅 ADMIN: SCHEDULE INTERVIEW AND CHANGE STATUS DATA
 */
app.post("/api/applications/schedule", async (req, res) => {
    const { application_id, interview_date } = req.body;
    try {
        await pool.query(
            "UPDATE applications SET status = 'Interview Scheduled', interview_date = $1 WHERE id = $2",
            [interview_date, application_id]
        );
        res.json({ message: "Interview scheduled successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update scheduler map state." });
    }
});

// Start Node Service Engine
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});