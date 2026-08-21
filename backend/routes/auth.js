const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

function signToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
}

function publicUser(row) {
    return {
        id: row.id,
        username: row.username,
        name: row.name,
        bio: row.bio,
        avatar: row.avatar,
        online: !!row.is_online
    };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { username, password, name } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: "username, password and name are required" });
        }

        const cleanUsername = username.trim().toLowerCase();

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE username = ?",
            [cleanUsername]
        );

        if (existing.length) {
            return res.status(409).json({ error: "Username already taken" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users (username, password_hash, name, bio, is_online)
             VALUES (?, ?, ?, '', TRUE)`,
            [cleanUsername, passwordHash, name.trim()]
        );

        const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
        const user = rows[0];

        res.status(201).json({ token: signToken(user), user: publicUser(user) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "username and password are required" });
        }

        const cleanUsername = username.trim().toLowerCase();

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            [cleanUsername]
        );

        if (!rows.length) {
            return res.status(401).json({ error: "Wrong username or password" });
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return res.status(401).json({ error: "Wrong username or password" });
        }

        await pool.query("UPDATE users SET is_online = TRUE WHERE id = ?", [user.id]);

        res.json({ token: signToken(user), user: publicUser(user) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router;
