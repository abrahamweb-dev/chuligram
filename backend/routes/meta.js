const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/groups
router.get("/groups", requireAuth, async (req, res) => {
    const [groups] = await pool.query("SELECT * FROM groups_table");

    const [memberRows] = await pool.query("SELECT * FROM group_members");
    const membersByGroup = {};
    memberRows.forEach(r => {
        (membersByGroup[r.group_id] ||= []).push(r.user_id);
    });

    res.json(groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatar: g.avatar,
        members: membersByGroup[g.id] || []
    })));
});

// GET /api/channels
router.get("/channels", requireAuth, async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM channels");
    res.json(rows);
});

// GET /api/bots
router.get("/bots", requireAuth, async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM bots");
    res.json(rows);
});

module.exports = router;
