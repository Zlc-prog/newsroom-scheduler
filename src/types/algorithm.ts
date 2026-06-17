import type { ShiftType } from './schedule';

export interface DayOffRequest {
  employeeId: number;
  dates: string[];
}

export interface SpecialShiftRequest {
  date: string;
  type: 'small_night' | 'mid_night' | 'big_night';
  employeeIds: number[];
}

export interface PlannerScheduleEntry {
  employeeId: number;
  dates: string[];
}

export interface AutoScheduleConfig {
  weekStart: string;
  selectedLeaderIds: number[];
  plannerSchedule: PlannerScheduleEntry[];
  dayOffRequests: DayOffRequest[];
  specialShifts: SpecialShiftRequest[];
  weekCount: number;
}

export type WarningType =
  | 'no_leader'
  | 'no_planner'
  | 'shift_conflict'
  | 'consecutive_days'
  | 'quota_unmet'
  | 'blocked_employee'
  | 'cross_week_consecutive'
  | 'cross_week_sun_night_mon_day'
  | 'consecutive_weekends'
  | 'intra_week_rest_risk'
  | 'duplicate_shift';

export interface AlgorithmWarning {
  type: WarningType;
  date?: string;
  employeeId?: number;
  message: string;
}

export interface NewAssignment {
  date: string;
  shift_type: ShiftType;
  employee_id: number;
  position: number;
  locked: 0 | 1;
  is_planner: 0 | 1;
}

export interface AlgorithmResult {
  assignments: NewAssignment[];
  warnings: AlgorithmWarning[];
}
