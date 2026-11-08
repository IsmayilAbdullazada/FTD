-- app/src/db/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'care_partner' CHECK (role IN ('care_partner', 'clinician', 'admin')),
    specialty VARCHAR(150), -- e.g., "Behavioral Neurologist", "Clinical Neuropsychologist"
    bio TEXT,
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    region VARCHAR(100), -- e.g., "Mid-Atlantic", "Northeast", "Global"
    ftd_subtype VARCHAR(50) CHECK (ftd_subtype IN ('bvFTD', 'PPA-Semantic', 'PPA-Nonfluent', 'FTD-MND', 'General')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cohort_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- "Daily Care", "Behavioral Strategies", "Speech & Language", "Legal & Financial", "Emotional Wellness"
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    clinician_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_clinician_endorsed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS private_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'responded', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    category VARCHAR(100) NOT NULL,
    file_or_external_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_cohort ON posts(cohort_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_post_replies_post ON post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_private_msgs_conv ON private_messages(conversation_id);
