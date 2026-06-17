import { getDb } from '../db/client';
import type {
  AssignmentRow,
  MeetingRow,
  Schedule,
  ScheduleFull,
  ScheduleSummary,
} from '../types/schedule';

interface ListFilters {
  from?: string;
  to?: string;
}

export const historyService = {
  async list(filters: ListFilters = {}): Promise<ScheduleSummary[]> {
    const db = await getDb();
    const where: string[] = [];
    const params: string[] = [];
    if (filters.from) {
      params.push(filters.from);
      where.push(`date(s.week_start, '+6 days') >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      where.push(`s.week_start <= $${params.length}`);
    }

    const sql = `
      SELECT s.id, s.week_start, s.status, s.notice, s.updated_at,
             COALESCE(a.cnt, 0) AS assignment_count,
             COALESCE(m.cnt, 0) AS meeting_count
      FROM schedules s
      LEFT JOIN (
        SELECT schedule_id, COUNT(*) AS cnt
        FROM schedule_assignments
        GROUP BY schedule_id
      ) a ON a.schedule_id = s.id
      LEFT JOIN (
        SELECT schedule_id, COUNT(*) AS cnt
        FROM schedule_meetings
        GROUP BY schedule_id
      ) m ON m.schedule_id = s.id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.week_start DESC, s.id DESC
    `;
    return db.select<ScheduleSummary[]>(sql, params);
  },

  async loadFull(schedule_id: number): Promise<ScheduleFull | null> {
    const db = await getDb();
    const rows = await db.select<
      (Schedule & { updated_at: string })[]
    >(
      'SELECT id, week_start, status, notice, updated_at FROM schedules WHERE id = $1',
      [schedule_id]
    );
    const schedule = rows[0];
    if (!schedule) return null;

    const [assignments, meetings] = await Promise.all([
      db.select<AssignmentRow[]>(
        `SELECT id, schedule_id, date, shift_type, employee_id,
                position, locked, is_planner
         FROM schedule_assignments
         WHERE schedule_id = $1
         ORDER BY date, shift_type, position`,
        [schedule_id]
      ),
      db.select<MeetingRow[]>(
        `SELECT id, schedule_id, date, name, position
         FROM schedule_meetings
         WHERE schedule_id = $1
         ORDER BY date, position`,
        [schedule_id]
      ),
    ]);
    return { schedule, assignments, meetings };
  },

  async remove(schedule_id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM schedules WHERE id = $1', [schedule_id]);
  },

  async copyTo(source_id: number, target_week_start: string): Promise<{
    schedule: Schedule & { updated_at: string };
    overwritten: boolean;
  }> {
    const db = await getDb();
    const full = await historyService.loadFull(source_id);
    if (!full) throw new Error('源排班不存在');
    if (full.schedule.week_start === target_week_start) {
      throw new Error('目标周与源周相同');
    }

    const existing = await db.select<{ id: number }[]>(
      'SELECT id FROM schedules WHERE week_start = $1',
      [target_week_start]
    );
    let target_id: number;
    let overwritten = false;
    if (existing[0]) {
      target_id = existing[0].id;
      overwritten = true;
      await db.execute(
        'DELETE FROM schedule_assignments WHERE schedule_id = $1',
        [target_id]
      );
      await db.execute(
        'DELETE FROM schedule_meetings WHERE schedule_id = $1',
        [target_id]
      );
      await db.execute(
        `UPDATE schedules SET notice = $1, updated_at = datetime('now','localtime') WHERE id = $2`,
        [full.schedule.notice, target_id]
      );
    } else {
      const res = await db.execute(
        'INSERT INTO schedules (week_start, status, notice) VALUES ($1, $2, $3)',
        [target_week_start, 'draft', full.schedule.notice]
      );
      target_id = Number(res.lastInsertId ?? 0);
    }

    const targetBase = new Date(target_week_start);
    const sourceBase = new Date(full.schedule.week_start);
    const dayDelta = Math.round(
      (targetBase.getTime() - sourceBase.getTime()) / 86_400_000
    );

    const shiftDate = (iso: string): string => {
      const d = new Date(iso);
      d.setDate(d.getDate() + dayDelta);
      return d.toISOString().slice(0, 10);
    };

    for (const a of full.assignments) {
      await db.execute(
        `INSERT INTO schedule_assignments
          (schedule_id, date, shift_type, employee_id, position, locked, is_planner)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          target_id,
          shiftDate(a.date),
          a.shift_type,
          a.employee_id,
          a.position,
          a.locked,
          a.is_planner,
        ]
      );
    }
    for (const m of full.meetings) {
      await db.execute(
        `INSERT INTO schedule_meetings (schedule_id, date, name, position)
         VALUES ($1,$2,$3,$4)`,
        [target_id, shiftDate(m.date), m.name, m.position]
      );
    }

    const refreshed = await db.select<
      (Schedule & { updated_at: string })[]
    >(
      'SELECT id, week_start, status, notice, updated_at FROM schedules WHERE id = $1',
      [target_id]
    );
    return { schedule: refreshed[0], overwritten };
  },
};
