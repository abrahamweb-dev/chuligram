require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const metaRoutes = require("./routes/meta");
const { attachChatSocket } = require("./sockets/chatSocket");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", metaRoutes); // /api/groups, /api/channels, /api/bots

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || "*" }
});

attachChatSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`✅ Chuligram backend running on http://localhost:${PORT}`);
});
