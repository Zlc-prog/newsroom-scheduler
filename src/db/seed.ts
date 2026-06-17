import type Database from '@tauri-apps/plugin-sql';

interface EmployeeSeed {
  name: string;
  is_leader?: 0 | 1;
  is_first_reviewer?: 0 | 1;
  mid_shift_only?: 0 | 1;
  day_shift_only?: 0 | 1;
  weekly_shifts?: number;
}

const DEPT_NAME = '海媒室';

const EMPLOYEES: EmployeeSeed[] = [
  { name: '员工1',  is_leader: 1 },
  { name: '员工2',  is_first_reviewer: 1 },
  { name: '员工3',  is_first_reviewer: 1 },
  { name: '员工4',  mid_shift_only: 1 },
  { name: '员工5',  mid_shift_only: 1 },
  { name: '员工6',  day_shift_only: 1 },
  { name: '员工7' },
  { name: '员工8' },
  { name: '员工9' },
  { name: '员工10' },
  { name: '员工11' },
  { name: '员工12' },
  { name: '员工13' },
  { name: '员工14' },
];

export async function seedTestData(db: Database): Promise<void> {
  const empRows = await db.select<{ c: number }[]>(
    'SELECT COUNT(*) AS c FROM employees'
  );
  if ((empRows[0]?.c ?? 0) > 0) return;

  await db.execute(
    'INSERT OR IGNORE INTO departments (name, description) VALUES ($1, $2)',
    [DEPT_NAME, '默认部门']
  );
  const deptRows = await db.select<{ id: number }[]>(
    'SELECT id FROM departments WHERE name = $1',
    [DEPT_NAME]
  );
  const deptId = deptRows[0]?.id ?? null;

  for (const e of EMPLOYEES) {
    await db.execute(
      `INSERT INTO employees
        (name, department_id, is_leader, is_first_reviewer,
         weekly_shifts, mid_shift_only, day_shift_only, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
      [
        e.name,
        deptId,
        e.is_leader ?? 0,
        e.is_first_reviewer ?? 0,
        e.weekly_shifts ?? 4,
        e.mid_shift_only ?? 0,
        e.day_shift_only ?? 0,
      ]
    );
  }
}
