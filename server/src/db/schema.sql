-- Relational Schema for Personal Real-Time Chat App
-- Supports 1-to-1 direct conversations now and cleanly extends to group conversations later.

PRAGMA foreign_keys = ON;

-- 1. Users table (Unique username identity, no passwords or avatars)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

-- Index for case-insensitive username lookup and search
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Conversations table (Supports 'direct' now, 'group' later)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('direct', 'group')) DEFAULT 'direct',
    title TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. Conversation Participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    last_read_message_id TEXT,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

-- 4. Messages table (Persistent message store)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- 5. Message Status table (Sent / Delivered / Read tracking per recipient)
CREATE TABLE IF NOT EXISTS message_status (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'read')) DEFAULT 'sent',
    updated_at TEXT NOT NULL,
    UNIQUE (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_status_recipient ON message_status(user_id, status);
