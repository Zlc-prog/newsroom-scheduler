import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Modal } from '../../components/ui/Modal';
import { useDepartmentStore } from '../../stores/departmentStore';
import type { Employee, EmployeeInput } from '../../types/employee';

interface Props {
  open: boolean;
  initial: Employee | null;
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => Promise<void>;
}

const EMPTY: EmployeeInput = {
  name: '',
  department_id: null,
  is_leader: 0,
  is_first_reviewer: 0,
  weekly_shifts: 5,
  mid_shift_only: 0,
  day_shift_only: 0,
  status: 'active',
};

function toInput(e: Employee | null): EmployeeInput {
  if (!e) return { ...EMPTY };
  return {
    name: e.name,
    department_id: e.department_id,
    is_leader: e.is_leader,
    is_first_reviewer: e.is_first_reviewer,
    weekly_shifts: e.weekly_shifts,
    mid_shift_only: e.mid_shift_only,
    day_shift_only: e.day_shift_only,
    status: e.status,
  };
}

export function EmployeeFormModal({ open, initial, onClose, onSubmit }: Props) {
  const departments = useDepartmentStore((s) => s.items);
  const fetchDepartments = useDepartmentStore((s) => s.fetchAll);

  const [form, setForm] = useState<EmployeeInput>(toInput(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeInput, string>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDepartments();
      setForm(toInput(initial));
      setErrors({});
    }
  }, [open, initial, fetchDepartments]);

  const update = <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleMid = (v: boolean) =>
    setForm((f) => ({
      ...f,
      mid_shift_only: v ? 1 : 0,
      day_shift_only: v ? 0 : f.day_shift_only,
    }));

  const toggleDay = (v: boolean) =>
    setForm((f) => ({
      ...f,
      day_shift_only: v ? 1 : 0,
      mid_shift_only: v ? 0 : f.mid_shift_only,
    }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof EmployeeInput, string>> = {};
    if (!form.name.trim()) e.name = '姓名必填';
    if (form.weekly_shifts < 0 || form.weekly_shifts > 7) {
      e.weekly_shifts = '每周班次需在 0–7 之间';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({ ...form, name: form.name.trim() });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors({ name: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? '编辑员工' : '新增员工'}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="姓名 *"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
        />
        <Select
          label="部门"
          value={form.department_id ?? ''}
          onChange={(e) =>
            update(
              'department_id',
              e.target.value ? Number(e.target.value) : null
            )
          }
        >
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Input
          label="每周班次 (0–7)"
          type="number"
          min={0}
          max={7}
          value={form.weekly_shifts}
          onChange={(e) =>
            update('weekly_shifts', Number(e.target.value) || 0)
          }
          error={errors.weekly_shifts}
        />
        <Select
          label="状态"
          value={form.status}
          onChange={(e) =>
            update('status', e.target.value as EmployeeInput['status'])
          }
        >
          <option value="active">在职</option>
          <option value="inactive">离职</option>
        </Select>

        <div className="col-span-2 grid grid-cols-2 gap-y-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <SwitchRow
            label="是否领导"
            checked={form.is_leader === 1}
            onChange={(v) => update('is_leader', v ? 1 : 0)}
          />
          <SwitchRow
            label="是否初审"
            checked={form.is_first_reviewer === 1}
            onChange={(v) => update('is_first_reviewer', v ? 1 : 0)}
          />
          <SwitchRow
            label="仅中班"
            checked={form.mid_shift_only === 1}
            onChange={toggleMid}
          />
          <SwitchRow
            label="仅白班"
            checked={form.day_shift_only === 1}
            onChange={toggleDay}
          />
        </div>
      </div>
    </Modal>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 pr-4 text-sm text-gray-700">
      <span>{label}</span>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </label>
  );
}
