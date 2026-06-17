import { getDb } from '../db/client';
import type {
  ScheduleEvent,
  ScheduleEventFilters,
  ScheduleEventInput,
} from '../types/scheduleEvent';

interface Row {
  id: number;
  name: string;
  type: ScheduleEvent['type'];
  start_date: string;
  end_date: string;
  block_scheduling: 0 | 1;
  show_time: 0 | 1;
  remark: string | null;
  emp_ids: string | null;
  emp_names: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  SELECT e.id, e.name, e.type, e.start_date, e.end_date,
         e.block_scheduling, e.show_time, e.remark, e.created_at, e.updated_at,
         GROUP_CONCAT(emp.id) AS emp_ids,
         GROUP_CONCAT(emp.name, '|||') AS emp_names
  FROM schedule_events e
  LEFT JOIN schedule_event_employees see ON see.event_id = e.id
  LEFT JOIN employees emp ON emp.id = see.employee_id
`;

function rowToEvent(r: Row): ScheduleEvent {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    start_date: r.start_date,
    end_date: r.end_date,
    block_scheduling: r.block_scheduling,
    show_time: r.show_time ?? 1,
    remark: r.remark,
    employee_ids: r.emp_ids
      ? r.emp_ids.split(',').map((s) => Number(s))
      : [],
    employee_names: r.emp_names ? r.emp_names.split('|||') : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const scheduleEventService = {
  async list(filters: ScheduleEventFilters): Promise<ScheduleEvent[]> {
    const db = await getDb();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (filters.type) {
      params.push(filters.type);
      where.push(`e.type = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      where.push(`e.end_date >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      where.push(`e.start_date <= $${params.length}`);
    }

    const sql =
      SELECT +
      (where.length ? ` WHERE ${where.join(' AND ')} ` : ' ') +
      ` GROUP BY e.id
        ORDER BY e.start_date DESC, e.id DESC`;

    const rows = await db.select<Row[]>(sql, params);
    return rows.map(rowToEvent);
  },

  async create(input: ScheduleEventInput): Promise<number> {
    const db = await getDb();
    const res = await db.execute(
      `INSERT INTO schedule_events
        (name, type, start_date, end_date, block_scheduling, show_time, remark)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.name,
        input.type,
        input.start_date,
        input.end_date,
        input.block_scheduling,
        input.show_time,
        input.remark ?? '',
      ]
    );
    const id = Number(res.lastInsertId ?? 0);
    if (!id) throw new Error('新建事项失败：数据库未返回有效 ID，请重试');
    for (const empId of input.employee_ids) {
      await db.execute(
        'INSERT INTO schedule_event_employees (event_id, employee_id) VALUES ($1, $2)',
        [id, empId]
      );
    }
    return id;
  },

  async update(id: number, input: ScheduleEventInput): Promise<void> {
    const db = await getDb();
    await db.execute(
      `UPDATE schedule_events SET
        name = $1, type = $2, start_date = $3, end_date = $4,
        block_scheduling = $5, show_time = $6, remark = $7,
        updated_at = datetime('now','localtime')
       WHERE id = $8`,
      [
        input.name,
        input.type,
        input.start_date,
        input.end_date,
        input.block_scheduling,
        input.show_time,
        input.remark ?? '',
        id,
      ]
    );
    await db.execute(
      'DELETE FROM schedule_event_employees WHERE event_id = $1',
      [id]
    );
    for (const empId of input.employee_ids) {
      await db.execute(
        'INSERT INTO schedule_event_employees (event_id, employee_id) VALUES ($1, $2)',
        [id, empId]
      );
    }
  },

  async remove(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM schedule_events WHERE id = $1', [id]);
  },
};
