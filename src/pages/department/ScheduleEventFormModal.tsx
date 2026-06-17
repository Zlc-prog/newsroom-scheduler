import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { MultiSelectEmployees } from '../../components/ui/MultiSelectEmployees';
import {
  EVENT_TYPE_OPTIONS,
  type ScheduleEvent,
  type ScheduleEventInput,
} from '../../types/scheduleEvent';

interface Props {
  open: boolean;
  initial: ScheduleEvent | null;
  onClose: () => void;
  onSubmit: (input: ScheduleEventInput) => Promise<void>;
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const empty = (): ScheduleEventInput => ({
  name: '',
  type: 'business_trip',
  start_date: todayIso(),
  end_date: todayIso(),
  block_scheduling: 0,
  show_time: 1,
  remark: '',
  employee_ids: [],
});

function toInput(e: ScheduleEvent | null): ScheduleEventInput {
  if (!e) return empty();
  return {
    name: e.name,
    type: e.type,
    start_date: e.start_date,
    end_date: e.end_date,
    block_scheduling: e.block_scheduling,
    show_time: e.show_time,
    remark: e.remark ?? '',
    employee_ids: [...e.employee_ids],
  };
}

export function ScheduleEventFormModal({
  open,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ScheduleEventInput>(toInput(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof ScheduleEventInput, string>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toInput(initial));
      setErrors({});
    }
  }, [open, initial]);

  const update = <K extends keyof ScheduleEventInput>(
    k: K,
    v: ScheduleEventInput[K]
  ) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof ScheduleEventInput, string>> = {};
    if (!form.name.trim()) e.name = '名称必填';
    if (!form.start_date) e.start_date = '开始日期必填';
    if (!form.end_date) e.end_date = '结束日期必填';
    if (
      form.start_date &&
      form.end_date &&
      form.start_date > form.end_date
    ) {
      e.end_date = '结束日期不能早于开始日期';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        remark: form.remark?.trim() ? form.remark.trim() : null,
      });
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
      title={initial ? '编辑事项' : '新增事项'}
      onClose={onClose}
      width={680}
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
          label="名称 *"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
        />
        <Select
          label="类型 *"
          value={form.type}
          onChange={(e) =>
            update('type', e.target.value as ScheduleEventInput['type'])
          }
        >
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          label="开始日期 *"
          type="date"
          value={form.start_date}
          onChange={(e) => update('start_date', e.target.value)}
          error={errors.start_date}
        />
        <Input
          label="结束日期 *"
          type="date"
          value={form.end_date}
          onChange={(e) => update('end_date', e.target.value)}
          error={errors.end_date}
        />

        <div className="col-span-2 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-gray-700">禁止排班</div>
            <div className="text-xs text-gray-500">
              开启后，事项期间内关联员工不会被自动排班
            </div>
          </div>
          <Switch
            checked={form.block_scheduling === 1}
            onChange={(v) => update('block_scheduling', v ? 1 : 0)}
            ariaLabel="是否禁止排班"
          />
        </div>

        <div className="col-span-2 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-gray-700">显示时间</div>
            <div className="text-xs text-gray-500">
              关闭后，排班页面事项栏中不显示该事项的日期
            </div>
          </div>
          <Switch
            checked={form.show_time === 1}
            onChange={(v) => update('show_time', v ? 1 : 0)}
            ariaLabel="是否显示时间"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            关联员工
          </label>
          <MultiSelectEmployees
            value={form.employee_ids}
            onChange={(next) => update('employee_ids', next)}
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700">备注</label>
          <textarea
            className="mt-1 h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.remark ?? ''}
            onChange={(e) => update('remark', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
