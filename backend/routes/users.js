const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

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

// GET /api/users  -> everyone except the caller (contacts list)
router.get("/", requireAuth, async (req, res) => {
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE id != ? ORDER BY name",
        [req.user.id]
    );
    res.json(rows.map(publicUser));
});

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(publicUser(rows[0]));
});

// PUT /api/users/me  -> edit name / bio
router.put("/me", requireAuth, async (req, res) => {
    const { name, bio } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Name cannot be empty" });
    }

    await pool.query(
        "UPDATE users SET name = ?, bio = ? WHERE id = ?",
        [name.trim(), bio || "", req.user.id]
    );

    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    res.json(publicUser(rows[0]));
});

// GET /api/users/:id
router.get("/:id", requireAuth, async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(publicUser(rows[0]));
});

module.exports = router;
