import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getWeekDates } from '../../utils/week';
import type { Employee } from '../../types/employee';
import type {
  AutoScheduleConfig,
  PlannerScheduleEntry,
} from '../../types/algorithm';

dayjs.extend(isoWeek);

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

interface Props {
  open: boolean;
  weekStart: string;
  employees: Employee[];
  onClose: () => void;
  onConfirm: (config: AutoScheduleConfig) => void;
}

type Step = 'leader' | 'planner' | 'dayoff' | 'weeks';
const STEPS: Step[] = ['leader', 'planner', 'dayoff', 'weeks'];
const STEP_TITLE: Record<Step, string> = {
  leader: '选择本周值班领导',
  planner: '选择本周值班策划',
  dayoff: '员工特殊请求（某天不上班）',
  weeks: '排班设置',
};

// ── shared components ──────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-blue-500 bg-blue-500 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
      }`}
    >
      {label}
    </button>
  );
}

/** Compact 7-day picker: shows Mon-Sun chips, toggleable */
function DayPicker({
  weekDates,
  selected,
  onChange,
}: {
  weekDates: string[];
  selected: string[];
  onChange: (dates: string[]) => void;
}) {
  const toggle = (d: string) => {
    const next = selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {weekDates.map((d, i) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={`rounded border px-2 py-0.5 text-xs transition-colors ${
            selected.includes(d)
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
          }`}
        >
          周{DAY_NAMES[i]}
        </button>
      ))}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export function AutoScheduleModal({ open, weekStart, employees, onClose, onConfirm }: Props) {
  const weekDates = getWeekDates(weekStart);
  const leaders = employees.filter((e) => e.is_leader === 1 && e.status === 'active');
  const planners = employees.filter(
    (e) => e.is_first_reviewer === 1 && e.is_leader === 0 && e.status === 'active'
  );
  const activeEmps = employees.filter((e) => e.status === 'active');

  const [step, setStep] = useState<Step>('leader');

  const [selectedLeaderIds, setSelectedLeaderIds] = useState<number[]>([]);

  const [plannerDays, setPlannerDays] = useState<Map<number, string[]>>(new Map());
  const [expandedPlanner, setExpandedPlanner] = useState<number | null>(null);

  const [dayOffDays, setDayOffDays] = useState<Map<number, string[]>>(new Map());
  const [expandedDayOff, setExpandedDayOff] = useState<number | null>(null);

  const [weekCount, setWeekCount] = useState(1);

  useEffect(() => {
    if (open) {
      setStep('leader');
      setSelectedLeaderIds([]);
      setPlannerDays(new Map());
      setExpandedPlanner(null);
      setDayOffDays(new Map());
      setExpandedDayOff(null);
      setWeekCount(1);
    }
  }, [open]);

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const toggleLeader = (id: number) =>
    setSelectedLeaderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const setPlannerDatesForEmp = (empId: number, dates: string[]) =>
    setPlannerDays((prev) => {
      const next = new Map(prev);
      if (dates.length === 0) next.delete(empId);
      else next.set(empId, dates);
      return next;
    });

  const setDayOffDatesForEmp = (empId: number, dates: string[]) =>
    setDayOffDays((prev) => {
      const next = new Map(prev);
      if (dates.length === 0) next.delete(empId);
      else next.set(empId, dates);
      return next;
    });

  const handleConfirm = () => {
    const plannerSchedule: PlannerScheduleEntry[] = Array.from(plannerDays.entries()).map(
      ([employeeId, dates]) => ({ employeeId, dates })
    );
    const dayOffRequests = Array.from(dayOffDays.entries()).map(([employeeId, dates]) => ({
      employeeId,
      dates,
    }));
    onConfirm({
      weekStart,
      selectedLeaderIds,
      plannerSchedule,
      dayOffRequests,
      specialShifts: [],
      weekCount,
    });
  };

  // ── step renderers ────────────────────────────────────────────────────────

  const renderLeader = () => (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        选中的领导将优先安排到工作日白班。如不选，系统自动均衡分配。
      </p>
      {leaders.length === 0 ? (
        <p className="text-xs text-gray-400">暂无领导员工</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {leaders.map((e) => (
            <Chip
              key={e.id}
              label={e.name}
              active={selectedLeaderIds.includes(e.id)}
              onClick={() => toggleLeader(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderPlanner = () => (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        点击员工名指定其担任策划的日期。未指定的日期系统自动从初审员工中分配。
      </p>
      {planners.length === 0 ? (
        <p className="text-xs text-gray-400">暂无初审员工</p>
      ) : (
        <div className="space-y-1">
          {planners.map((e) => {
            const selected = plannerDays.get(e.id) ?? [];
            const isExpanded = expandedPlanner === e.id;
            return (
              <div key={e.id} className="rounded-md border border-gray-200">
                <button
                  type="button"
                  onClick={() => setExpandedPlanner(isExpanded ? null : e.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-sm font-medium text-gray-800">{e.name}</span>
                  <span className="text-xs text-gray-400">
                    {selected.length > 0
                      ? selected.map((d) => `周${DAY_NAMES[weekDates.indexOf(d)]}`).join(' ')
                      : '未指定'}
                    <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
                  </span>
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                    <DayPicker
                      weekDates={weekDates}
                      selected={selected}
                      onChange={(dates) => setPlannerDatesForEmp(e.id, dates)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDayOff = () => (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        点击员工名，选择其本周不上班的日期（该日不安排任何班次）。
      </p>
      <div className="space-y-1">
        {activeEmps.map((e) => {
          const selected = dayOffDays.get(e.id) ?? [];
          const isExpanded = expandedDayOff === e.id;
          return (
            <div key={e.id} className="rounded-md border border-gray-200">
              <button
                type="button"
                onClick={() => setExpandedDayOff(isExpanded ? null : e.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-sm text-gray-800">{e.name}</span>
                <span className="text-xs text-gray-400">
                  {selected.length > 0
                    ? selected.map((d) => `周${DAY_NAMES[weekDates.indexOf(d)]}`).join(' ')
                    : '无请求'}
                  <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
                </span>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                  <DayPicker
                    weekDates={weekDates}
                    selected={selected}
                    onChange={(dates) => setDayOffDatesForEmp(e.id, dates)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeeks = () => (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        连续生成多周排班，后一周参考前一周结果保持公平性延续。
      </p>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <Chip
            key={n}
            label={`${n} 周`}
            active={weekCount === n}
            onClick={() => setWeekCount(n)}
          />
        ))}
      </div>
      {weekCount > 1 && (
        <p className="text-[11px] text-amber-600">
          注意：后续各周的现有未锁定排班将被覆盖。
        </p>
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'leader': return renderLeader();
      case 'planner': return renderPlanner();
      case 'dayoff': return renderDayOff();
      case 'weeks': return renderWeeks();
    }
  };

  return (
    <Modal
      open={open}
      title="智能排班设置"
      onClose={onClose}
      width={520}
      footer={
        <div className="flex w-full items-center">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {!isFirst && (
              <Button variant="secondary" onClick={() => setStep(STEPS[stepIndex - 1])}>
                上一步
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>取消</Button>
            {isLast ? (
              <Button onClick={handleConfirm}>开始排班</Button>
            ) : (
              <Button onClick={() => setStep(STEPS[stepIndex + 1])}>下一步</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-800">{STEP_TITLE[step]}</div>
        <div className="text-xs text-gray-400">步骤 {stepIndex + 1} / {STEPS.length}</div>
        <div>{renderStep()}</div>
      </div>
    </Modal>
  );
}
