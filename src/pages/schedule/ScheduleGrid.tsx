import { useMemo, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import dayjs from 'dayjs';
import { clsx } from 'clsx';
import { AssignmentCard } from './AssignmentCard';
import { MeetingCell } from './MeetingCell';
import {
  SHIFT_LABEL,
  SHIFT_ORDER,
  NIGHT_SHIFT_TYPES,
  type Assignment,
  type Meeting,
  type ShiftType,
} from '../../types/schedule';
import { weekdayLabel } from '../../utils/week';
import type { Employee } from '../../types/employee';

interface Props {
  dates: string[];
  assignments: Assignment[];
  meetings: Meeting[];
  employees: Map<number, Employee>;
  readOnly?: boolean;
  activeNightShifts?: ShiftType[];
  onAddClick?: (date: string, shift: ShiftType) => void;
  onRemove?: (uid: string) => void;
  onToggleLock?: (uid: string) => void;
  onTogglePlanner?: (uid: string) => void;
  onAddMeeting?: (date: string, name: string) => void;
  onRenameMeeting?: (uid: string, name: string) => void;
  onRemoveMeeting?: (uid: string) => void;
  onAddNightShift?: (shift: ShiftType) => void;
  onEmployeeDoubleClick?: (employeeId: number) => void;
}

const SHIFT_TONE: Record<ShiftType, string> = {
  day: 'bg-sky-50/40',
  mid: 'bg-amber-50/40',
  topic: 'bg-violet-50/40',
  meeting: 'bg-emerald-50/40',
  night: 'bg-slate-100/60',
  night_small: 'bg-blue-50/60',
  night_mid: 'bg-indigo-50/60',
};

export function ScheduleGrid({
  dates,
  assignments,
  meetings,
  employees,
  readOnly,
  activeNightShifts = [],
  onAddClick,
  onRemove,
  onToggleLock,
  onTogglePlanner,
  onAddMeeting,
  onRenameMeeting,
  onRemoveMeeting,
  onAddNightShift,
  onEmployeeDoubleClick,
}: Props) {
  const [showNightPicker, setShowNightPicker] = useState(false);

  const cells = useMemo(() => {
    const m: Record<string, Assignment[]> = {};
    for (const a of assignments) {
      const k = `${a.date}|${a.shift_type}`;
      (m[k] ??= []).push(a);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.position - b.position);
    return m;
  }, [assignments]);

  const meetingsByDate = useMemo(() => {
    const m: Record<string, Meeting[]> = {};
    for (const it of meetings) (m[it.date] ??= []).push(it);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.position - b.position);
    return m;
  }, [meetings]);

  const today = dayjs().format('YYYY-MM-DD');

  const renderCellContent = (
    list: Assignment[],
    placeholder: React.ReactNode,
    d: string,
    shift: ShiftType
  ) => (
    <div className="min-h-[44px] p-1 flex flex-col gap-1">
      {list.map((a, idx) => (
        <AssignmentCard
          key={a.uid}
          assignment={a}
          employee={employees.get(a.employee_id)}
          index={idx}
          readOnly={readOnly}
          onRemove={onRemove}
          onToggleLock={onToggleLock}
          onTogglePlanner={onTogglePlanner}
          onDoubleClick={onEmployeeDoubleClick}
        />
      ))}
      {placeholder}
      {!readOnly && (
        <button
          type="button"
          onClick={() => onAddClick?.(d, shift)}
          className={clsx(
            'rounded border border-dashed border-gray-300 py-0.5 text-[11px] text-gray-400 transition-colors hover:border-blue-300 hover:bg-white hover:text-blue-500',
            'mt-auto'
          )}
        >
          + 添加
        </button>
      )}
    </div>
  );

  const renderShiftRow = (shift: ShiftType) => (
    <tr key={shift}>
      <th
        className={clsx(
          'border-b border-r border-gray-200 px-1.5 py-1 text-left text-sm font-medium text-gray-700',
          SHIFT_TONE[shift]
        )}
      >
        {SHIFT_LABEL[shift]}
      </th>
      {dates.map((d) => {
        if (shift === 'meeting') {
          return (
            <td
              key={`${d}|meeting`}
              className={clsx(
                'border-b border-r border-gray-200 align-top',
                SHIFT_TONE.meeting
              )}
            >
              <MeetingCell
                date={d}
                meetings={meetingsByDate[d] ?? []}
                readOnly={readOnly}
                onAdd={onAddMeeting}
                onRename={onRenameMeeting}
                onRemove={onRemoveMeeting}
              />
            </td>
          );
        }

        const key = `${d}|${shift}`;
        const list = cells[key] ?? [];
        if (readOnly) {
          return (
            <td
              key={key}
              className={clsx(
                'border-b border-r border-gray-200 align-top',
                SHIFT_TONE[shift]
              )}
            >
              {renderCellContent(list, null, d, shift)}
            </td>
          );
        }

        return (
          <Droppable droppableId={key} key={key}>
            {(provided, snapshot) => (
              <td
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={clsx(
                  'border-b border-r border-gray-200 align-top',
                  SHIFT_TONE[shift],
                  snapshot.isDraggingOver && 'bg-blue-50'
                )}
              >
                {renderCellContent(list, provided.placeholder, d, shift)}
              </td>
            )}
          </Droppable>
        );
      })}
    </tr>
  );

  const availableNightShifts = NIGHT_SHIFT_TYPES.filter(
    (t) => !activeNightShifts.includes(t)
  );

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[72px] border-b border-r border-gray-200 bg-gray-50 px-1.5 py-1 text-left text-sm font-semibold uppercase text-gray-500">
              班次
            </th>
            {dates.map((d) => {
              const isToday = d === today;
              return (
                <th
                  key={d}
                  className={clsx(
                    'border-b border-r border-gray-200 bg-gray-50 px-1.5 py-1 text-left text-sm font-semibold',
                    isToday ? 'text-blue-700' : 'text-gray-600'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{weekdayLabel(d)}</span>
                    <span className="font-mono text-xs text-gray-400">
                      {dayjs(d).format('MM/DD')}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {SHIFT_ORDER.map(renderShiftRow)}
          {activeNightShifts.map(renderShiftRow)}
          {!readOnly && availableNightShifts.length > 0 && (
            <tr>
              <th
                className="border-b border-r border-gray-200 bg-gray-50 px-1.5 py-1 text-left align-middle"
                colSpan={1 + dates.length}
              >
                <div className="flex items-center gap-2">
                  {!showNightPicker ? (
                    <button
                      type="button"
                      onClick={() => setShowNightPicker(true)}
                      className="rounded border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 hover:border-slate-400 hover:text-slate-600 transition-colors"
                    >
                      + 夜班
                    </button>
                  ) : (
                    <>
                      <span className="text-xs text-gray-400">选择夜班类型：</span>
                      {availableNightShifts.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            onAddNightShift?.(t);
                            setShowNightPicker(false);
                          }}
                          className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          {SHIFT_LABEL[t]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowNightPicker(false)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </th>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
