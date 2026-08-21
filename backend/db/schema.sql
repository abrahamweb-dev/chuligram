-- =====================================================
-- CHULIGRAM DATABASE SCHEMA
-- Open this in MySQL Workbench and run it against your
-- MySQL server to create the database and tables.
-- =====================================================

CREATE DATABASE IF NOT EXISTS chuligram
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE chuligram;

-- ---------------------------------------------------
-- USERS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    name           VARCHAR(100) NOT NULL,
    bio            VARCHAR(255) DEFAULT '',
    avatar         VARCHAR(255) DEFAULT '',
    is_online      BOOLEAN      DEFAULT FALSE,
    last_seen      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------
-- MESSAGES (private chats)
-- chat_id is deterministic: "private_<lowerId>_<higherId>"
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    chat_id      VARCHAR(100) NOT NULL,
    sender_id    INT NOT NULL,
    receiver_id  INT NOT NULL,
    text         TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_chat_id (chat_id),
    INDEX idx_created_at (created_at)
);

-- ---------------------------------------------------
-- GROUPS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS groups_table (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    description  VARCHAR(255) DEFAULT '',
    avatar       VARCHAR(10)  DEFAULT '👥',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id  INT NOT NULL,
    user_id   INT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- CHANNELS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    description   VARCHAR(255) DEFAULT '',
    subscribers   INT DEFAULT 0,
    avatar        VARCHAR(10) DEFAULT '📢'
);

-- ---------------------------------------------------
-- BOTS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS bots (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(50)  NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL,
    description  VARCHAR(255) DEFAULT ''
);

-- =====================================================
-- SEED DATA (matches the original static fixtures,
-- passwords hashed for "1234" — see db/seed.js to
-- regenerate hashes safely instead of hardcoding them)
-- =====================================================

INSERT INTO groups_table (name, description, avatar) VALUES
    ('Chuligram Group', 'Official Chuligram test group', '👥'),
    ('Developers', 'Web development discussion', '💻');

INSERT INTO channels (name, username, description, subscribers, avatar) VALUES
    ('Chuligram News', 'chuligramnews', 'Official Chuligram announcements.', 25, '📢'),
    ('Coding Daily', 'codingdaily', 'Daily coding content.', 42, '💻'),
    ('Tech World', 'techworld', 'Technology news and discussion.', 31, '🌐');

INSERT INTO bots (username, name, description) VALUES
    ('chuligrambot', 'Chuligram Bot', 'Official test bot'),
    ('helpbot', 'Help Bot', 'Provides help'),
    ('timebot', 'Time Bot', 'Shows the current time'),
    ('infobot', 'Info Bot', 'Information bot'),
    ('funbot', 'Fun Bot', 'Fun commands');

-- NOTE: users are NOT seeded here with plaintext-derived hashes.
-- Run `npm run seed` (db/seed.js) after this script to create
-- the 10 demo users with properly bcrypt-hashed passwords.
