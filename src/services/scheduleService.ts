import { getDb } from '../db/client';
import type {
  Assignment,
  AssignmentRow,
  Meeting,
  MeetingRow,
  Schedule,
} from '../types/schedule';

interface SaveInput {
  week_start: string;
  notice: string;
  assignments: Omit<Assignment, 'uid'>[];
  meetings: Omit<Meeting, 'uid'>[];
}

export const scheduleService = {
  async getOrCreate(week_start: string): Promise<Schedule> {
    const db = await getDb();
    const rows = await db.select<Schedule[]>(
      'SELECT id, week_start, status, notice FROM schedules WHERE week_start = $1',
      [week_start]
    );
    if (rows[0]) return rows[0];

    const res = await db.execute(
      "INSERT INTO schedules (week_start) VALUES ($1)",
      [week_start]
    );
    return {
      id: Number(res.lastInsertId ?? 0),
      week_start,
      status: 'draft',
      notice: '请按时参加汇报会，做好OA交接',
    };
  },

  async listAssignments(schedule_id: number): Promise<AssignmentRow[]> {
    const db = await getDb();
    return db.select<AssignmentRow[]>(
      `SELECT id, schedule_id, date, shift_type, employee_id,
              position, locked, is_planner
       FROM schedule_assignments
       WHERE schedule_id = $1
       ORDER BY date, shift_type, position`,
      [schedule_id]
    );
  },

  async listMeetings(schedule_id: number): Promise<MeetingRow[]> {
    const db = await getDb();
    return db.select<MeetingRow[]>(
      `SELECT id, schedule_id, date, name, position
       FROM schedule_meetings
       WHERE schedule_id = $1
       ORDER BY date, position`,
      [schedule_id]
    );
  },

  async save(input: SaveInput): Promise<{
    schedule: Schedule;
    assignmentRows: AssignmentRow[];
    meetingRows: MeetingRow[];
  }> {
    const db = await getDb();
    const schedule = await scheduleService.getOrCreate(input.week_start);

    await db.execute(
      `UPDATE schedules SET notice = $1, updated_at = datetime('now','localtime') WHERE id = $2`,
      [input.notice, schedule.id]
    );

    await db.execute(
      'DELETE FROM schedule_assignments WHERE schedule_id = $1',
      [schedule.id]
    );
    // Batch INSERT to minimise pool round-trips (SQLite variable limit = 999; use 7 cols → max 142 rows/batch)
    const ASSIGN_BATCH = 100;
    for (let i = 0; i < input.assignments.length; i += ASSIGN_BATCH) {
      const batch = input.assignments.slice(i, i + ASSIGN_BATCH);
      const placeholders = batch
        .map((_, j) => `($${j * 7 + 1},$${j * 7 + 2},$${j * 7 + 3},$${j * 7 + 4},$${j * 7 + 5},$${j * 7 + 6},$${j * 7 + 7})`)
        .join(',');
      const values = batch.flatMap((a) => [
        schedule.id, a.date, a.shift_type, a.employee_id, a.position, a.locked, a.is_planner,
      ]);
      await db.execute(
        `INSERT INTO schedule_assignments (schedule_id, date, shift_type, employee_id, position, locked, is_planner) VALUES ${placeholders}`,
        values
      );
    }

    await db.execute(
      'DELETE FROM schedule_meetings WHERE schedule_id = $1',
      [schedule.id]
    );
    const MEET_BATCH = 200;
    for (let i = 0; i < input.meetings.length; i += MEET_BATCH) {
      const batch = input.meetings.slice(i, i + MEET_BATCH);
      const placeholders = batch
        .map((_, j) => `($${j * 4 + 1},$${j * 4 + 2},$${j * 4 + 3},$${j * 4 + 4})`)
        .join(',');
      const values = batch.flatMap((m) => [schedule.id, m.date, m.name, m.position]);
      await db.execute(
        `INSERT INTO schedule_meetings (schedule_id, date, name, position) VALUES ${placeholders}`,
        values
      );
    }

    // Sequential reads to avoid concurrent pool pressure
    const assignmentRows = await scheduleService.listAssignments(schedule.id);
    const meetingRows = await scheduleService.listMeetings(schedule.id);
    const refreshed = await db.select<Schedule[]>(
      'SELECT id, week_start, status, notice FROM schedules WHERE id = $1',
      [schedule.id]
    );
    return { schedule: refreshed[0] ?? schedule, assignmentRows, meetingRows };
  },
};
