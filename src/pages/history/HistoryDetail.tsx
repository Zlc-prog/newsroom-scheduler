import { useEffect, useMemo } from 'react';
import { ScheduleGrid } from '../schedule/ScheduleGrid';
import { useEmployeeStore } from '../../stores/employeeStore';
import type {
  Assignment,
  AssignmentRow,
  Meeting,
  MeetingRow,
  Schedule,
} from '../../types/schedule';
import { formatRange, getWeekDates } from '../../utils/week';

interface Props {
  detail: {
    schedule: Schedule & { updated_at: string };
    assignments: AssignmentRow[];
    meetings: MeetingRow[];
  } | null;
  loading: boolean;
}

function rowToAssignment(r: AssignmentRow): Assignment {
  return {
    uid: `da-${r.id}`,
    id: r.id,
    date: r.date,
    shift_type: r.shift_type,
    employee_id: r.employee_id,
    position: r.position,
    locked: r.locked,
    is_planner: r.is_planner,
  };
}
function rowToMeeting(r: MeetingRow): Meeting {
  return {
    uid: `dm-${r.id}`,
    id: r.id,
    date: r.date,
    name: r.name,
    position: r.position,
  };
}

export function HistoryDetail({ detail, loading }: Props) {
  const employees = useEmployeeStore((s) => s.items);
  const fetchEmployees = useEmployeeStore((s) => s.fetchAll);

  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
  }, [employees.length, fetchEmployees]);

  const empMap = useMemo(() => {
    const m = new Map<number, (typeof employees)[number]>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-400">
        加载详情中…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-sm text-gray-400">
        从左侧选择一周查看详情
      </div>
    );
  }

  const dates = getWeekDates(detail.schedule.week_start);
  const assignments = detail.assignments.map(rowToAssignment);
  const meetings = detail.meetings.map(rowToMeeting);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 rounded-md border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-mono text-base font-semibold text-gray-900">
            {formatRange(detail.schedule.week_start)}
          </h3>
          <span className="text-[11px] text-gray-400">
            状态 {detail.schedule.status} · 更新 {detail.schedule.updated_at}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {detail.schedule.notice}
        </p>
      </div>

      <ScheduleGrid
        dates={dates}
        assignments={assignments}
        meetings={meetings}
        employees={empMap}
        readOnly
      />
    </div>
  );
}
