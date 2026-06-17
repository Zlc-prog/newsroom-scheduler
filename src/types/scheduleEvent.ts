export type ScheduleEventType =
  | 'business_trip'
  | 'training'
  | 'leave'
  | 'time_off'
  | 'holiday_activity'
  | 'temp_night_shift';

export const EVENT_TYPE_LABEL: Record<ScheduleEventType, string> = {
  business_trip: '出差',
  training: '培训',
  leave: '请假',
  time_off: '调休',
  holiday_activity: '其他',
  temp_night_shift: '临时大夜',
};

// Only 4 types are available for new events; legacy types kept for display compat
export const EVENT_TYPE_OPTIONS: { value: ScheduleEventType; label: string }[] = [
  { value: 'business_trip',    label: '出差' },
  { value: 'training',         label: '培训' },
  { value: 'leave',            label: '请假' },
  { value: 'holiday_activity', label: '其他' },
];

export interface ScheduleEvent {
  id: number;
  name: string;
  type: ScheduleEventType;
  start_date: string;
  end_date: string;
  block_scheduling: 0 | 1;
  show_time: 0 | 1;
  remark: string | null;
  employee_ids: number[];
  employee_names: string[];
  created_at: string;
  updated_at: string;
}

export interface ScheduleEventInput {
  name: string;
  type: ScheduleEventType;
  start_date: string;
  end_date: string;
  block_scheduling: 0 | 1;
  show_time: 0 | 1;
  remark: string | null;
  employee_ids: number[];
}

export interface ScheduleEventFilters {
  type: ScheduleEventType | '';
  from: string;
  to: string;
}
