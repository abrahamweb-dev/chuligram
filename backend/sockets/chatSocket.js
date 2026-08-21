const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function chatIdFor(a, b) {
    const ids = [Number(a), Number(b)].sort((x, y) => x - y);
    return `private_${ids[0]}_${ids[1]}`;
}

// userId -> Set of socket ids (a user can have multiple tabs/devices)
const onlineUsers = new Map();

function attachChatSocket(io) {

    // Authenticate every socket connection using the same JWT the REST API uses
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Missing auth token"));
        }

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = payload.id;
            next();
        } catch (err) {
            next(new Error("Invalid auth token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.userId;

        // Track presence
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        await pool.query("UPDATE users SET is_online = TRUE WHERE id = ?", [userId]);
        io.emit("presence", { userId, online: true });

        // Each user joins a personal room so we can push to them by id
        socket.join(`user_${userId}`);

        socket.on("send_message", async ({ toUserId, text }) => {
            if (!text || !text.trim() || !toUserId) return;

            const chatId = chatIdFor(userId, toUserId);

            try {
                const [result] = await pool.query(
                    `INSERT INTO messages (chat_id, sender_id, receiver_id, text)
                     VALUES (?, ?, ?, ?)`,
                    [chatId, userId, toUserId, text.trim()]
                );

                const [rows] = await pool.query(
                    "SELECT * FROM messages WHERE id = ?",
                    [result.insertId]
                );

                const message = rows[0];

                // Deliver to both participants (sender's other tabs + receiver)
                io.to(`user_${userId}`).to(`user_${toUserId}`).emit("receive_message", message);

            } catch (err) {
                console.error("send_message failed:", err);
                socket.emit("error_message", { error: "Message could not be sent" });
            }
        });

        socket.on("typing", ({ toUserId, isTyping }) => {
            io.to(`user_${toUserId}`).emit("typing", { fromUserId: userId, isTyping });
        });

        socket.on("disconnect", async () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    await pool.query(
                        "UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ?",
                        [userId]
                    );
                    io.emit("presence", { userId, online: false });
                }
            }
        });
    });
}

module.exports = { attachChatSocket };
