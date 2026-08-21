const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function chatIdFor(a, b) {
    const ids = [Number(a), Number(b)].sort((x, y) => x - y);
    return `private_${ids[0]}_${ids[1]}`;
}

// GET /api/messages/:otherUserId  -> full history with that user
router.get("/:otherUserId", requireAuth, async (req, res) => {
    const chatId = chatIdFor(req.user.id, req.params.otherUserId);

    const [rows] = await pool.query(
        "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
        [chatId]
    );

    res.json(rows);
});

// GET /api/chats  -> one row per conversation, most recent message first
// (used to build the Home.html chat list)
router.get("/", requireAuth, async (req, res) => {
    const [rows] = await pool.query(
        `SELECT m.*
         FROM messages m
         INNER JOIN (
             SELECT chat_id, MAX(id) AS max_id
             FROM messages
             WHERE sender_id = ? OR receiver_id = ?
             GROUP BY chat_id
         ) latest ON m.chat_id = latest.chat_id AND m.id = latest.max_id
         ORDER BY m.created_at DESC`,
        [req.user.id, req.user.id]
    );

    res.json(rows);
});

module.exports = router;
