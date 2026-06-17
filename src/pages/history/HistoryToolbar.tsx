import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface Props {
  from: string;
  to: string;
  total: number;
  onChange: (patch: { from?: string; to?: string }) => void;
  onReset: () => void;
}

export function HistoryToolbar({ from, to, total, onChange, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="w-40">
        <Input
          label="开始日期 ≥"
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </div>
      <div className="w-40">
        <Input
          label="结束日期 ≤"
          type="date"
          value={to}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>
      <Button variant="secondary" size="sm" onClick={onReset}>
        重置
      </Button>
      <span className="ml-auto text-xs text-gray-500">共 {total} 条历史</span>
    </div>
  );
}
