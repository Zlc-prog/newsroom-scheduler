import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useEmployeeStore } from '../../stores/employeeStore';
import {
  SHIFT_LABEL,
  type ShiftType,
} from '../../types/schedule';
import { getWeekDates, weekdayLabel } from '../../utils/week';
import type { Employee } from '../../types/employee';

interface Props {
  open: boolean;
  weekStart: string;
  defaultDate: string;
  shift: ShiftType | null;
  isExcluded: (date: string, employeeId: number) => boolean;
  onClose: () => void;
  onPickMany: (employeeId: number, dates: string[]) => void;
}

const WORKDAY_INDEXES = [0, 1, 2, 3, 4];
const ALL_INDEXES = [0, 1, 2, 3, 4, 5, 6];

export function EmployeePickerModal({
  open,
  weekStart,
  defaultDate,
  shift,
  isExcluded,
  onClose,
  onPickMany,
}: Props) {
  const items = useEmployeeStore((s) => s.items);
  const fetchAll = useEmployeeStore((s) => s.fetchAll);
  const [activeEmp, setActiveEmp] = useState<Employee | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (items.length === 0) fetchAll();
      setActiveEmp(null);
      setSelectedDates([defaultDate]);
    }
  }, [open, defaultDate, items.length, fetchAll]);

  const dates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const { reviewers, others } = useMemo(() => {
    const active = items.filter((e) => e.status === 'active');
    return {
      reviewers: active.filter((e) => e.is_first_reviewer === 1),
      others: active.filter((e) => e.is_first_reviewer !== 1),
    };
  }, [items]);

  const toggleDate = (d: string) => {
    setSelectedDates((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const selectIndexes = (idxs: number[]) => {
    setSelectedDates(idxs.map((i) => dates[i]).filter(Boolean));
  };

  const handleConfirm = () => {
    if (!activeEmp || selectedDates.length === 0) return;
    onPickMany(activeEmp.id, selectedDates);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={`添加员工 — ${shift ? SHIFT_LABEL[shift] : ''}`}
      onClose={onClose}
      width={680}
      footer={
        activeEmp ? (
          <>
            <Button variant="secondary" onClick={() => setActiveEmp(null)}>
              返回选员工
            </Button>
            <Button onClick={handleConfirm} disabled={selectedDates.length === 0}>
              填充 {selectedDates.length} 天
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
        )
      }
    >
      {!activeEmp ? (
        <div className="space-y-4">
          <EmployeeRow
            title="初审员工"
            tone="reviewer"
            items={reviewers}
            onPick={setActiveEmp}
          />
          <EmployeeRow
            title="非初审员工"
            tone="normal"
            items={others}
            onPick={setActiveEmp}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">已选员工：</span>
            <span className="font-medium text-gray-900">{activeEmp.name}</span>
            {activeEmp.is_first_reviewer === 1 && (
              <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                初审
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">快捷：</span>
            <button
              type="button"
              className="rounded border border-gray-200 bg-white px-2 py-1 hover:border-blue-300 hover:text-blue-600"
              onClick={() => selectIndexes(WORKDAY_INDEXES)}
            >
              工作日
            </button>
            <button
              type="button"
              className="rounded border border-gray-200 bg-white px-2 py-1 hover:border-blue-300 hover:text-blue-600"
              onClick={() => selectIndexes(ALL_INDEXES)}
            >
              整周
            </button>
            <button
              type="button"
              className="rounded border border-gray-200 bg-white px-2 py-1 hover:border-blue-300 hover:text-blue-600"
              onClick={() => setSelectedDates([])}
            >
              清空
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {dates.map((d) => {
              const checked = selectedDates.includes(d);
              const excluded = isExcluded(d, activeEmp.id);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => !excluded && toggleDate(d)}
                  disabled={excluded}
                  className={clsx(
                    'flex flex-col items-center rounded-md border px-1 py-2 text-xs transition-colors',
                    excluded
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                      : checked
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  )}
                >
                  <span className="font-medium">{weekdayLabel(d)}</span>
                  <span className="mt-0.5 font-mono text-[10px] opacity-80">
                    {dayjs(d).format('MM/DD')}
                  </span>
                  {excluded && (
                    <span className="mt-0.5 text-[10px]">已存在</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

function EmployeeRow({
  title,
  tone,
  items,
  onPick,
}: {
  title: string;
  tone: 'reviewer' | 'normal';
  items: Employee[];
  onPick: (e: Employee) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        <span className="text-[11px] text-gray-400">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-400">
          无
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onPick(e)}
              className={clsx(
                'h-7 rounded-full border px-3 text-xs transition-colors',
                tone === 'reviewer'
                  ? 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
              )}
            >
              {e.name}
              {e.is_leader === 1 && (
                <span className="ml-1 rounded bg-rose-600 px-1 text-[9px] font-bold text-white">
                  值
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
