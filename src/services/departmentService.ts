import { getDb } from '../db/client';
import type { Department, DepartmentInput } from '../types/department';

export const departmentService = {
  async list(): Promise<Department[]> {
    const db = await getDb();
    return db.select<Department[]>(
      'SELECT id, name, description, created_at FROM departments ORDER BY id ASC'
    );
  },

  async create(input: DepartmentInput): Promise<number> {
    const db = await getDb();
    const res = await db.execute(
      'INSERT INTO departments (name, description) VALUES ($1, $2)',
      [input.name, input.description]
    );
    return Number(res.lastInsertId ?? 0);
  },

  async update(id: number, input: DepartmentInput): Promise<void> {
    const db = await getDb();
    await db.execute(
      'UPDATE departments SET name = $1, description = $2 WHERE id = $3',
      [input.name, input.description, id]
    );
  },

  async remove(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM departments WHERE id = $1', [id]);
  },

  async countEmployees(id: number): Promise<number> {
    const db = await getDb();
    const rows = await db.select<{ c: number }[]>(
      'SELECT COUNT(*) AS c FROM employees WHERE department_id = $1',
      [id]
    );
    return rows[0]?.c ?? 0;
  },
};
