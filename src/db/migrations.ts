export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );`,

  `CREATE TABLE IF NOT EXISTS employees (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT    NOT NULL,
    department_id     INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    is_leader         INTEGER NOT NULL DEFAULT 0 CHECK(is_leader IN (0,1)),
    is_first_reviewer INTEGER NOT NULL DEFAULT 0 CHECK(is_first_reviewer IN (0,1)),
    weekly_shifts     INTEGER NOT NULL DEFAULT 0 CHECK(weekly_shifts BETWEEN 0 AND 7),
    mid_shift_only    INTEGER NOT NULL DEFAULT 0 CHECK(mid_shift_only IN (0,1)),
    day_shift_only    INTEGER NOT NULL DEFAULT 0 CHECK(day_shift_only IN (0,1)),
    status            TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CHECK(NOT (mid_shift_only = 1 AND day_shift_only = 1))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);`,
  `CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);`,

  `CREATE TABLE IF NOT EXISTS schedule_events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    type             TEXT    NOT NULL CHECK(type IN
                       ('business_trip','training','leave','time_off',
                        'holiday_activity','temp_night_shift')),
    start_date       TEXT    NOT NULL,
    end_date         TEXT    NOT NULL,
    block_scheduling INTEGER NOT NULL DEFAULT 0 CHECK(block_scheduling IN (0,1)),
    show_time        INTEGER NOT NULL DEFAULT 1 CHECK(show_time IN (0,1)),
    remark           TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CHECK(start_date <= end_date)
  );`,

  `CREATE TABLE IF NOT EXISTS schedule_event_employees (
    event_id    INTEGER NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id)       ON DELETE CASCADE,
    PRIMARY KEY (event_id, employee_id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_events_type ON schedule_events(type);`,
  `CREATE INDEX IF NOT EXISTS idx_events_dates ON schedule_events(start_date, end_date);`,
  `CREATE INDEX IF NOT EXISTS idx_event_emps_emp ON schedule_event_employees(employee_id);`,

  `CREATE TABLE IF NOT EXISTS schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start  TEXT    NOT NULL UNIQUE,
    status      TEXT    NOT NULL DEFAULT 'draft'
                CHECK(status IN ('draft','published','archived')),
    notice      TEXT    NOT NULL DEFAULT '请按时参加汇报会，做好OA交接',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );`,

  `CREATE TABLE IF NOT EXISTS schedule_assignments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id  INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    shift_type   TEXT    NOT NULL CHECK(shift_type IN
                  ('day','mid','topic','meeting','night','night_small','night_mid')),
    employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL DEFAULT 0,
    locked       INTEGER NOT NULL DEFAULT 0 CHECK(locked IN (0,1)),
    is_planner   INTEGER NOT NULL DEFAULT 0 CHECK(is_planner IN (0,1)),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_assign_schedule ON schedule_assignments(schedule_id);`,
  `CREATE INDEX IF NOT EXISTS idx_assign_emp ON schedule_assignments(employee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_assign_date_shift ON schedule_assignments(date, shift_type);`,

  `CREATE TABLE IF NOT EXISTS schedule_meetings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    date        TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );`,
  `CREATE INDEX IF NOT EXISTS idx_meeting_schedule ON schedule_meetings(schedule_id);`,
];

// Column additions for existing databases — run with error swallowed so they
// are safe to execute on both fresh installs and upgrades.
export const COLUMN_MIGRATIONS: string[] = [
  `ALTER TABLE schedule_events ADD COLUMN show_time INTEGER NOT NULL DEFAULT 1`,
];
