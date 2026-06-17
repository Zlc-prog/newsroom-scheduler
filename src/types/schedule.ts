export type ShiftType = 'day' | 'mid' | 'topic' | 'meeting' | 'night' | 'night_small' | 'night_mid';

export const SHIFT_LABEL: Record<ShiftType, string> = {
  day: '白班',
  mid: '中班',
  topic: '专题采制',
  meeting: '会议',
  night: '大夜',
  night_small: '小夜',
  night_mid: '中夜',
};

export const SHIFT_ORDER: ShiftType[] = ['day', 'mid', 'topic', 'meeting'];

export const NIGHT_SHIFT_TYPES: ShiftType[] = ['night_small', 'night_mid', 'night'];

export type ScheduleStatus = 'draft' | 'published' | 'archived';

export interface Schedule {
  id: number;
  week_start: string;
  status: ScheduleStatus;
  notice: string;
}

export interface Assignment {
  uid: string;
  id: number;
  date: string;
  shift_type: ShiftType;
  employee_id: number;
  position: number;
  locked: 0 | 1;
  is_planner: 0 | 1;
}

export interface AssignmentRow {
  id: number;
  schedule_id: number;
  date: string;
  shift_type: ShiftType;
  employee_id: number;
  position: number;
  locked: 0 | 1;
  is_planner: 0 | 1;
}

export interface Meeting {
  uid: string;
  id: number;
  date: string;
  name: string;
  position: number;
}

export interface MeetingRow {
  id: number;
  schedule_id: number;
  date: string;
  name: string;
  position: number;
}

export interface ScheduleSummary {
  id: number;
  week_start: string;
  status: ScheduleStatus;
  notice: string;
  updated_at: string;
  assignment_count: number;
  meeting_count: number;
}

export interface ScheduleFull {
  schedule: Schedule & { updated_at: string };
  assignments: AssignmentRow[];
  meetings: MeetingRow[];
}
