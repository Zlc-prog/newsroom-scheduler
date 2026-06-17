import { useEffect, useMemo } from 'react';
import { useScheduleEventStore } from '../../stores/scheduleEventStore';
import type { ScheduleEvent } from '../../types/scheduleEvent';

interface Props {
  weekStart: string;
  weekEnd: string;
  employeeNameOf: (id: number) => string;
}

interface Group {
  title: string;
  hint?: string;
  events: ScheduleEvent[];
}

export function SideStaff({ weekStart, weekEnd, employeeNameOf }: Props) {
  const items = useScheduleEventStore((s) => s.items);
  const setFilters = useScheduleEventStore((s) => s.setFilters);

  useEffect(() => {
    setFilters({ type: '', from: weekStart, to: weekEnd });
  }, [weekStart, weekEnd, setFilters]);

  const groups = useMemo<Group[]>(() => {
    return [
      {
        title: '出差人员',
        events: items.filter((e) => e.type === 'business_trip'),
      },
      { title: '请假人员', events: items.filter((e) => e.type === 'leave') },
      {
        title: '培训人员',
        events: items.filter((e) => e.type === 'training'),
      },
      {
        title: '其他',
        events: items.filter(
          (e) => !(['business_trip', 'training', 'leave'] as string[]).includes(e.type)
        ),
      },
    ];
  }, [items]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {groups.map((g) => (
        <div
          key={g.title}
          className="rounded-lg border border-gray-200 bg-white p-3"
        >
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-gray-800">{g.title}</h3>
            {g.hint && (
              <span className="text-[11px] text-gray-400">{g.hint}</span>
            )}
          </div>
          {g.events.length === 0 ? (
            <div className="py-3 text-center text-xs text-gray-400">无</div>
          ) : (
            <ul className="space-y-1.5">
              {g.events.map((e) => (
                <li key={e.id} className="text-xs">
                  {e.show_time !== 0 && (
                    <div className="font-mono text-[11px] text-gray-400">
                      {e.start_date}
                      {e.end_date !== e.start_date ? ` ~ ${e.end_date}` : ''}
                    </div>
                  )}
                  <div className="text-gray-700">{e.name}</div>
                  {e.employee_ids.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {e.employee_ids.map((id) => (
                        <span
                          key={`${e.id}-${id}`}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700"
                        >
                          {employeeNameOf(id)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
