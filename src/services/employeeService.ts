import { getDb } from '../db/client';
import type { Employee, EmployeeInput, EmployeePatchKey } from '../types/employee';

const SELECT_EMPLOYEE = `
  SELECT e.id, e.name, e.department_id,
         d.name AS department_name,
         e.is_leader, e.is_first_reviewer,
         e.weekly_shifts, e.mid_shift_only, e.day_shift_only,
         e.status, e.created_at, e.updated_at
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
`;

export const employeeService = {
  async list(): Promise<Employee[]> {
    const db = await getDb();
    return db.select<Employee[]>(`${SELECT_EMPLOYEE} ORDER BY e.id DESC`);
  },

  async create(input: EmployeeInput): Promise<number> {
    const db = await getDb();
    const res = await db.execute(
      `INSERT INTO employees
        (name, department_id, is_leader, is_first_reviewer,
         weekly_shifts, mid_shift_only, day_shift_only, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.name,
        input.department_id,
        input.is_leader,
        input.is_first_reviewer,
        input.weekly_shifts,
        input.mid_shift_only,
        input.day_shift_only,
        input.status,
      ]
    );
    return Number(res.lastInsertId ?? 0);
  },

  async update(id: number, input: EmployeeInput): Promise<void> {
    const db = await getDb();
    await db.execute(
      `UPDATE employees SET
        name = $1, department_id = $2,
        is_leader = $3, is_first_reviewer = $4,
        weekly_shifts = $5, mid_shift_only = $6, day_shift_only = $7,
        status = $8,
        updated_at = datetime('now','localtime')
       WHERE id = $9`,
      [
        input.name,
        input.department_id,
        input.is_leader,
        input.is_first_reviewer,
        input.weekly_shifts,
        input.mid_shift_only,
        input.day_shift_only,
        input.status,
        id,
      ]
    );
  },

  async remove(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM employees WHERE id = $1', [id]);
  },

  async patch(
    current: Employee,
    key: EmployeePatchKey,
    value: number | string
  ): Promise<void> {
    const db = await getDb();

    if (key === 'status') {
      await db.execute(
        `UPDATE employees SET status = $1, updated_at = datetime('now','localtime') WHERE id = $2`,
        [value, current.id]
      );
      return;
    }

    const v = value as 0 | 1;

    if (key === 'mid_shift_only' && v === 1) {
      await db.execute(
        `UPDATE employees SET mid_shift_only = 1, day_shift_only = 0,
          updated_at = datetime('now','localtime') WHERE id = $1`,
        [current.id]
      );
      return;
    }
    if (key === 'day_shift_only' && v === 1) {
      await db.execute(
        `UPDATE employees SET day_shift_only = 1, mid_shift_only = 0,
          updated_at = datetime('now','localtime') WHERE id = $1`,
        [current.id]
      );
      return;
    }

    await db.execute(
      `UPDATE employees SET ${key} = $1, updated_at = datetime('now','localtime') WHERE id = $2`,
      [v, current.id]
    );
  },
};
