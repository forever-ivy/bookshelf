-- ============================================================
-- 智慧书架系统 数据库建表脚本
-- 基于项目 ER 图，PostgreSQL 语法
-- ============================================================

-- 1. 账号表
CREATE TABLE account (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active',       -- active / disabled
    system_role   TEXT NOT NULL DEFAULT 'user',         -- user / admin
    token_version INTEGER NOT NULL DEFAULT 1,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 家庭表
CREATE TABLE family (
    id                SERIAL PRIMARY KEY,
    family_name       TEXT NOT NULL,
    owner_account_id  INTEGER NOT NULL REFERENCES account(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 成员表
CREATE TABLE member (
    id             SERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'child',       -- parent / child
    avatar         TEXT,
    pin            TEXT,
    color          TEXT,
    gender         TEXT,
    birth_date     DATE,
    age            INTEGER,
    grade_level    TEXT,
    reading_level  TEXT,
    interests      TEXT,
    family_id      INTEGER NOT NULL REFERENCES family(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 账号-成员关联表（多对多）
CREATE TABLE account_member (
    id            SERIAL PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES account(id),
    user_id       INTEGER NOT NULL REFERENCES member(id),
    relation_type TEXT NOT NULL DEFAULT 'parent',       -- parent / child / other
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, user_id)
);

-- 5. 当前成员会话表（每账号一行）
CREATE TABLE current_member_session (
    id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    user_id     INTEGER NOT NULL REFERENCES member(id),
    switched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 阅读目标表
CREATE TABLE reading_goal (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES member(id),
    weekly_target INTEGER NOT NULL DEFAULT 7,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- 7. 徽章表
CREATE TABLE badge (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES member(id),
    badge_key   TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, badge_key)
);

-- 8. 必读书表
CREATE TABLE must_read (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES member(id),
    book_id               INTEGER REFERENCES book(id),
    title                 TEXT NOT NULL,
    note                  TEXT,
    done                  INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    done_at               TIMESTAMPTZ,
    assigned_by_user_id   INTEGER REFERENCES member(id)
);

-- 9. 图书表
CREATE TABLE book (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    author           TEXT,
    category         TEXT,
    keywords         TEXT,
    description      TEXT,
    isbn             TEXT,
    publisher        TEXT,
    publish_year     INTEGER,
    age_min          INTEGER,
    age_max          INTEGER,
    difficulty_level TEXT,
    tags             TEXT,
    cover_url        TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. 格口表
CREATE TABLE compartment (
    compartment_id INTEGER PRIMARY KEY,
    x             INTEGER NOT NULL,
    y             INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'empty'         -- empty / occupied / locked
);

-- 11. 在架图书表
CREATE TABLE on_shelf_book (
    compartment_id INTEGER PRIMARY KEY REFERENCES compartment(compartment_id),
    book_id        INTEGER NOT NULL REFERENCES book(id) UNIQUE,
    stored_time    TEXT NOT NULL
);

-- 12. 借阅日志表
CREATE TABLE borrow_log (
    id                 SERIAL PRIMARY KEY,
    book_id            INTEGER NOT NULL REFERENCES book(id),
    action             TEXT NOT NULL,                    -- store / take / return
    compartment_id     INTEGER REFERENCES compartment(compartment_id),
    action_time        TEXT NOT NULL,
    user_id            INTEGER REFERENCES member(id),
    source             TEXT,
    operator_user_id   INTEGER REFERENCES member(id),
    target_user_id     INTEGER REFERENCES member(id),
    session_id         INTEGER,
    device_id          TEXT,
    result             TEXT,
    remark             TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. 阅读事件表
CREATE TABLE reading_event (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES member(id),
    event_type    TEXT NOT NULL,                         -- borrow / return / browse / recommend
    book_id       INTEGER NOT NULL REFERENCES book(id),
    event_time    TIMESTAMPTZ NOT NULL DEFAULT now(),
    source        TEXT,
    metadata_json JSONB
);

-- 14. 书柜配置表
CREATE TABLE cabinet_config (
    id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    cabinet_name TEXT NOT NULL DEFAULT '主书柜',
    family_id    INTEGER NOT NULL REFERENCES family(id),
    initialized  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. 配对码表
CREATE TABLE pairing_code (
    id         SERIAL PRIMARY KEY,
    code       TEXT NOT NULL UNIQUE,
    issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX idx_member_family       ON member(family_id);
CREATE INDEX idx_account_member_acct ON account_member(account_id);
CREATE INDEX idx_account_member_user ON account_member(user_id);
CREATE INDEX idx_must_read_user      ON must_read(user_id);
CREATE INDEX idx_must_read_book      ON must_read(book_id);
CREATE INDEX idx_borrow_log_book     ON borrow_log(book_id);
CREATE INDEX idx_borrow_log_user     ON borrow_log(user_id);
CREATE INDEX idx_borrow_log_time     ON borrow_log(action_time);
CREATE INDEX idx_reading_event_user  ON reading_event(user_id);
CREATE INDEX idx_reading_event_book  ON reading_event(book_id);
CREATE INDEX idx_reading_event_time  ON reading_event(event_time);
CREATE INDEX idx_book_isbn           ON book(isbn);
CREATE INDEX idx_book_category       ON book(category);
CREATE INDEX idx_pairing_code_code   ON pairing_code(code);
