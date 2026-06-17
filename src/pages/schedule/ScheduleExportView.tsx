import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { ScheduleGrid } from './ScheduleGrid';
import { NIGHT_SHIFT_TYPES, type Assignment, type Meeting } from '../../types/schedule';
import type { Employee } from '../../types/employee';
import type { ScheduleEvent } from '../../types/scheduleEvent';

interface Props {
  deptName: string;
  weekStart: string;
  dates: string[];
  assignments: Assignment[];
  meetings: Meeting[];
  notice: string;
  events: ScheduleEvent[];
  empMap: Map<number, Employee>;
}

const EVENT_GROUPS = [
  { title: '出差人员', filter: (t: string) => t === 'business_trip' },
  { title: '请假人员', filter: (t: string) => t === 'leave' },
  { title: '培训人员', filter: (t: string) => t === 'training' },
  { title: '其他',    filter: (t: string) => !['business_trip', 'leave', 'training'].includes(t) },
];

export const ScheduleExportView = forwardRef<HTMLDivElement, Props>(
  function ScheduleExportView({ deptName, weekStart, dates, assignments, meetings, notice, events, empMap }, ref) {
    const weekEnd = dates[6] ?? weekStart;
    const startMd = dayjs(weekStart).format('M月D日');
    const endMd = dayjs(weekEnd).format('M月D日');
    const activeNightShifts = NIGHT_SHIFT_TYPES.filter((t) =>
      assignments.some((a) => a.shift_type === t)
    );

    return (
      <div ref={ref} className="w-[840px] bg-white p-5">
        {/* Title */}
        <h1 className="mb-4 text-center text-xl font-bold text-gray-900">
          {deptName}编辑排班&nbsp;&nbsp;{startMd}—{endMd}
        </h1>

        {/* Reuse the real ScheduleGrid in read-only mode — identical Tailwind styles */}
        <ScheduleGrid
          dates={dates}
          assignments={assignments}
          meetings={meetings}
          employees={empMap}
          activeNightShifts={activeNightShifts}
          readOnly
        />

        {/* Notice — static text version */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2">
          <span className="shrink-0 text-sm font-medium text-amber-700">提示</span>
          <span className="text-sm text-amber-900">{notice}</span>
        </div>

        {/* Department events — same layout as SideStaff */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {EVENT_GROUPS.map((g) => {
            const items = events.filter((e) => g.filter(e.type));
            return (
              <div key={g.title} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-gray-800">{g.title}</div>
                {items.length === 0 ? (
                  <div className="py-3 text-center text-xs text-gray-400">无</div>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((ev) => (
                      <li key={ev.id} className="text-xs">
                        {ev.show_time !== 0 && (
                          <div className="font-mono text-[11px] text-gray-400">
                            {ev.start_date}{ev.end_date !== ev.start_date ? ` ~ ${ev.end_date}` : ''}
                          </div>
                        )}
                        <div className="text-gray-700">{ev.name}</div>
                        {ev.employee_ids.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {ev.employee_ids.map((id) => (
                              <span
                                key={id}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700"
                              >
                                {empMap.get(id)?.name ?? `员工${id}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
