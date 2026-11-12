PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS active_session (
    id INTEGER PRIMARY KEY
        CHECK (id = 1),

    book_id INTEGER NOT NULL,

    state TEXT NOT NULL
        CHECK (state IN ('reading', 'paused')),

    started_at INTEGER NOT NULL,

    start_page INTEGER NOT NULL
        CHECK (start_page >= 0),

    -- Накопичений активний час до останнього
    -- запуску або відновлення таймера.
    accumulated_ms INTEGER NOT NULL DEFAULT 0
        CHECK (accumulated_ms >= 0),

    -- Початок поточного відрізка читання.
    -- Під час паузи значення відсутнє.
    running_since INTEGER,

    -- Останнє збереження стану для відновлення.
    updated_at INTEGER NOT NULL
        CHECK (updated_at >= started_at),

    CHECK (
        (
            state = 'reading'
            AND running_since IS NOT NULL
            AND running_since >= started_at
            AND running_since <= updated_at
        )
        OR
        (
            state = 'paused'
            AND running_since IS NULL
        )
    ),

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,

    title TEXT NOT NULL
        CHECK (length(trim(title)) > 0),

    author TEXT NOT NULL DEFAULT '',

    total_pages INTEGER NOT NULL
        CHECK (total_pages > 0),

    current_page INTEGER NOT NULL DEFAULT 0
        CHECK (
            current_page >= 0
            AND current_page <= total_pages
        ),

    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (
            status IN (
                'planned',
                'reading',
                'paused',
                'finished'
            )
        ),

    description TEXT NOT NULL DEFAULT '',
    cover BLOB,
    deadline TEXT
);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY,

    book_id INTEGER NOT NULL,

    type TEXT NOT NULL DEFAULT 'note'
        CHECK (type IN ('note', 'quote')),

    content TEXT NOT NULL
        CHECK (length(trim(content)) > 0),

    page_number INTEGER
        CHECK (
            page_number IS NULL
            OR page_number >= 1
        ),

    -- Час у мілісекундах UTC.
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
        CHECK (updated_at >= created_at),

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS planned_sessions (
    id INTEGER PRIMARY KEY,

    book_id INTEGER NOT NULL,

    -- Запланований час початку у мілісекундах UTC.
    scheduled_at INTEGER NOT NULL,

    duration_minutes INTEGER NOT NULL
        CHECK (duration_minutes > 0),

    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (
            status IN (
                'planned',
                'completed',
                'cancelled'
            )
        ),

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY
        CHECK (id = 1),

    name TEXT NOT NULL DEFAULT 'Читач',
    avatar BLOB,

    daily_goal_minutes INTEGER NOT NULL DEFAULT 30
        CHECK (daily_goal_minutes > 0)
);

CREATE TABLE IF NOT EXISTS reading_sessions (
    id INTEGER PRIMARY KEY,

    book_id INTEGER NOT NULL,

    -- Час початку та завершення у мілісекундах UTC.
    started_at INTEGER NOT NULL,

    ended_at INTEGER NOT NULL
        CHECK (ended_at >= started_at),

    -- Активний час читання без пауз.
    duration_ms INTEGER NOT NULL
        CHECK (
            duration_ms >= 0
            AND duration_ms <= ended_at - started_at
        ),

    start_page INTEGER NOT NULL
        CHECK (start_page >= 0),

    end_page INTEGER NOT NULL
        CHECK (end_page >= start_page),

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY
        CHECK (id = 1),

    theme TEXT NOT NULL DEFAULT 'system'
        CHECK (theme IN ('light', 'dark', 'system')),

    language TEXT NOT NULL DEFAULT 'uk'
        CHECK (language = 'uk'),

    mini_timer_always_on_top INTEGER NOT NULL DEFAULT 1
        CHECK (mini_timer_always_on_top IN (0, 1)),

    close_to_tray INTEGER NOT NULL DEFAULT 1
        CHECK (close_to_tray IN (0, 1)),

    notifications_enabled INTEGER NOT NULL DEFAULT 1
        CHECK (notifications_enabled IN (0, 1)),

    eye_reminders_enabled INTEGER NOT NULL DEFAULT 1
        CHECK (eye_reminders_enabled IN (0, 1)),

    eye_interval_minutes INTEGER NOT NULL DEFAULT 20
        CHECK (eye_interval_minutes > 0),

    eye_break_seconds INTEGER NOT NULL DEFAULT 20
        CHECK (eye_break_seconds > 0),

    stretch_reminders_enabled INTEGER NOT NULL DEFAULT 1
        CHECK (stretch_reminders_enabled IN (0, 1)),

    stretch_interval_minutes INTEGER NOT NULL DEFAULT 45
        CHECK (stretch_interval_minutes > 0),

    snooze_minutes INTEGER NOT NULL DEFAULT 5
        CHECK (snooze_minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_books_status
    ON books(status);

CREATE INDEX IF NOT EXISTS idx_notes_book_created
    ON notes(book_id, created_at);

CREATE INDEX IF NOT EXISTS idx_planned_book
    ON planned_sessions(book_id);

CREATE INDEX IF NOT EXISTS idx_planned_scheduled
    ON planned_sessions(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_sessions_book_started
    ON reading_sessions(book_id, started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_ended
    ON reading_sessions(ended_at);
INSERT OR IGNORE INTO profile (id) VALUES (1);
INSERT OR IGNORE INTO settings (id) VALUES (1);
-- Schema version and upgrades are managed by src/database.ts.
