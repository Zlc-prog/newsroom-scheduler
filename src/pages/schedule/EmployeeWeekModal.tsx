import { Modal } from '../../components/ui/Modal';
import { SHIFT_LABEL, type Assignment, type ShiftType } from '../../types/schedule';
import type { Employee } from '../../types/employee';
import { weekdayLabel } from '../../utils/week';

interface Props {
  open: boolean;
  employee: Employee | null;
  dates: string[];
  assignments: Assignment[];
  onClose: () => void;
}

const WORK_SHIFTS = new Set<ShiftType>(['day', 'mid', 'topic', 'night', 'night_small', 'night_mid']);

export function EmployeeWeekModal({ open, employee, dates, assignments, onClose }: Props) {
  if (!employee) return null;

  const cellLabel = (date: string): string => {
    const hits = assignments.filter(
      (a) => a.employee_id === employee.id && a.date === date && WORK_SHIFTS.has(a.shift_type)
    );
    if (hits.length === 0) return '休';
    return hits.map((a) => SHIFT_LABEL[a.shift_type]).join('/');
  };

  return (
    <Modal open={open} title={`${employee.name} 本周排班`} onClose={onClose} width={520}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {dates.map((d) => (
                <th
                  key={d}
                  className="border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600"
                >
                  {weekdayLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {dates.map((d) => {
                const label = cellLabel(d);
                const isRest = label === '休';
                return (
                  <td
                    key={d}
                    className={`border border-gray-200 px-3 py-3 text-center text-sm ${
                      isRest ? 'text-gray-400' : 'font-medium text-gray-800'
                    }`}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
