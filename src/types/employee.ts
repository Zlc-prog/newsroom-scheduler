export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: number;
  name: string;
  department_id: number | null;
  department_name?: string | null;
  is_leader: 0 | 1;
  is_first_reviewer: 0 | 1;
  weekly_shifts: number;
  mid_shift_only: 0 | 1;
  day_shift_only: 0 | 1;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInput {
  name: string;
  department_id: number | null;
  is_leader: 0 | 1;
  is_first_reviewer: 0 | 1;
  weekly_shifts: number;
  mid_shift_only: 0 | 1;
  day_shift_only: 0 | 1;
  status: EmployeeStatus;
}

export type EmployeePatchKey =
  | 'is_leader'
  | 'is_first_reviewer'
  | 'mid_shift_only'
  | 'day_shift_only'
  | 'status';
