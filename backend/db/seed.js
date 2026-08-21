// =====================================================
// Seeds the 10 demo users (same as the old Data/Users.js
// fixture) with bcrypt-hashed passwords.
// Run: npm run seed   (after running schema.sql)
// =====================================================

require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const demoUsers = [
    { username: "alex",     name: "Alex",     bio: "Welcome to Chuligram 👋", online: true  },
    { username: "abraham",  name: "Abraham",  bio: "Web developer 💻",        online: true  },
    { username: "user03",   name: "User 03",  bio: "Hello Chuligram!",        online: true  },
    { username: "user04",   name: "User 04",  bio: "Nice to meet you.",       online: false },
    { username: "user05",   name: "User 05",  bio: "Chuligram user",          online: false },
    { username: "user06",   name: "User 06",  bio: "Hey 👋",                  online: true  },
    { username: "user07",   name: "User 07",  bio: "Good vibes.",             online: false },
    { username: "user08",   name: "User 08",  bio: "Chuligram!",              online: true  },
    { username: "user09",   name: "User 09",  bio: "Hello.",                  online: false },
    { username: "user10",   name: "User 10",  bio: "Enjoying Chuligram.",     online: true  }
];

async function seed() {
    const passwordHash = await bcrypt.hash("1234", 10);

    for (const u of demoUsers) {
        await pool.query(
            `INSERT INTO users (username, password_hash, name, bio, avatar, is_online)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name)`,
            [u.username, passwordHash, u.name, u.bio, "", u.online]
        );
    }

    console.log("✅ Seeded", demoUsers.length, "demo users (password for all: 1234)");
    process.exit(0);
}

seed().catch(err => {
    console.error("Seed failed:", err);
    process.exit(1);
});
