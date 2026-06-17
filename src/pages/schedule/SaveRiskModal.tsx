import { Modal } from '../../components/ui/Modal';
import type { AlgorithmWarning, WarningType } from '../../types/algorithm';

interface Props {
  open: boolean;
  risks: AlgorithmWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

const RISK_META: Record<
  WarningType,
  { label: string; color: string }
> = {
  no_leader:                  { label: '缺少领导',       color: 'bg-red-100 text-red-700' },
  no_planner:                 { label: '缺少策划',       color: 'bg-red-100 text-red-700' },
  shift_conflict:             { label: '班次冲突',       color: 'bg-orange-100 text-orange-700' },
  consecutive_days:           { label: '连续上班',       color: 'bg-orange-100 text-orange-700' },
  quota_unmet:                { label: '配额不足',       color: 'bg-yellow-100 text-yellow-700' },
  blocked_employee:           { label: '事项阻断',       color: 'bg-yellow-100 text-yellow-700' },
  cross_week_consecutive:     { label: '跨周连续',       color: 'bg-orange-100 text-orange-700' },
  cross_week_sun_night_mon_day: { label: '跨周冲突',     color: 'bg-orange-100 text-orange-700' },
  consecutive_weekends:       { label: '连续周末',       color: 'bg-orange-100 text-orange-700' },
  intra_week_rest_risk:       { label: '休息不足',       color: 'bg-yellow-100 text-yellow-700' },
  duplicate_shift:            { label: '重复排班',       color: 'bg-red-100 text-red-700' },
};

export function SaveRiskModal({ open, risks, onConfirm, onCancel }: Props) {
  return (
    <Modal
      open={open}
      title="保存前风险提示"
      onClose={onCancel}
      width={520}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            仍然保存
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-500">
        发现 <span className="font-semibold text-gray-700">{risks.length}</span> 条风险，建议核查后再保存。
      </p>
      <ul className="space-y-2">
        {risks.map((w, i) => {
          const meta = RISK_META[w.type] ?? { label: w.type, color: 'bg-gray-100 text-gray-700' };
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-gray-700">{w.message}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
