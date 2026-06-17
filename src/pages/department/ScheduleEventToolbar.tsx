import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EVENT_TYPE_OPTIONS } from '../../types/scheduleEvent';
import type { ScheduleEventFilters } from '../../types/scheduleEvent';

interface Props {
  filters: ScheduleEventFilters;
  onChange: (patch: Partial<ScheduleEventFilters>) => void;
  onReset: () => void;
}

export function ScheduleEventToolbar({ filters, onChange, onReset }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="w-40">
        <Select
          label="类型"
          value={filters.type}
          onChange={(e) =>
            onChange({ type: e.target.value as ScheduleEventFilters['type'] })
          }
        >
          <option value="">全部</option>
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-44">
        <Input
          label="开始日期 ≥"
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </div>
      <div className="w-44">
        <Input
          label="结束日期 ≤"
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>
      <div className="ml-auto">
        <Button variant="secondary" onClick={onReset}>
          重置筛选
        </Button>
      </div>
    </div>
  );
}
