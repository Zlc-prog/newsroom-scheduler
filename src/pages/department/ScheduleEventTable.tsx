import { Button } from '../../components/ui/Button';
import {
  EVENT_TYPE_LABEL,
  type ScheduleEvent,
} from '../../types/scheduleEvent';

interface Props {
  data: ScheduleEvent[];
  loading: boolean;
  onEdit: (e: ScheduleEvent) => void;
  onDelete: (e: ScheduleEvent) => void;
}

const TYPE_TONE: Record<ScheduleEvent['type'], string> = {
  business_trip: 'bg-amber-50 text-amber-700',
  training: 'bg-sky-50 text-sky-700',
  leave: 'bg-rose-50 text-rose-700',
  time_off: 'bg-emerald-50 text-emerald-700',
  holiday_activity: 'bg-violet-50 text-violet-700',
  temp_night_shift: 'bg-slate-100 text-slate-700',
};

export function ScheduleEventTable({ data, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
        加载中…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
        无符合条件的事项
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">名称</th>
            <th className="px-4 py-3 font-medium">类型</th>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">关联员工</th>
            <th className="px-4 py-3 text-center font-medium">禁止排班</th>
            <th className="px-4 py-3 font-medium">备注</th>
            <th className="px-4 py-3 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs ${TYPE_TONE[e.type]}`}
                >
                  {EVENT_TYPE_LABEL[e.type]}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">
                {e.start_date}
                {e.end_date !== e.start_date ? ` ~ ${e.end_date}` : ''}
              </td>
              <td className="max-w-xs px-4 py-3 text-gray-600">
                {e.employee_names.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {e.employee_names.slice(0, 4).map((n, idx) => (
                      <span
                        key={`${e.id}-${idx}`}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
                      >
                        {n}
                      </span>
                    ))}
                    {e.employee_names.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{e.employee_names.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {e.block_scheduling === 1 ? (
                  <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    禁止
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-500">
                {e.remark || '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(e)}>
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(e)}
                  >
                    <span className="text-red-600">删除</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
