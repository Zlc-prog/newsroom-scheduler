import { Button } from '../../components/ui/Button';
import { formatRange } from '../../utils/week';

interface Props {
  weekStart: string;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  scheduling: boolean;
  exporting: boolean;
  excelExporting: boolean;
  autoSaved: boolean;
  canUndo: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onAutoSchedule: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportJpg: () => void;
  onUndo: () => void;
  onPreview: () => void;
}

export function ScheduleHeader({
  weekStart,
  dirty,
  saving,
  loading,
  scheduling,
  exporting,
  excelExporting,
  autoSaved,
  canUndo,
  onPrevWeek,
  onNextWeek,
  onToday,
  onAutoSchedule,
  onSave,
  onExport,
  onExportJpg,
  onUndo,
  onPreview,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1 py-1 shadow-sm">
        <Button variant="ghost" size="sm" onClick={onPrevWeek} disabled={loading}>
          ←
        </Button>
        <span className="px-2 font-mono text-sm font-medium text-gray-700">
          {formatRange(weekStart)}
        </span>
        <Button variant="ghost" size="sm" onClick={onNextWeek} disabled={loading}>
          →
        </Button>
      </div>
      <Button variant="secondary" size="sm" onClick={onToday} disabled={loading}>
        本周
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {saving && <span className="text-xs text-gray-400">保存中…</span>}
        {!saving && autoSaved && <span className="text-xs text-green-600">✓ 已自动保存</span>}
        {!saving && !autoSaved && dirty && (
          <span className="text-xs text-amber-600">● 有未保存的改动</span>
        )}
        <Button variant="secondary" size="sm" onClick={onUndo} disabled={!canUndo}>
          撤回
        </Button>
        <Button variant="secondary" onClick={onAutoSchedule} disabled={loading || scheduling}>
          {scheduling ? '排班中…' : '智能排班'}
        </Button>
        <Button variant="secondary" onClick={onExport} disabled={excelExporting}>
          {excelExporting ? '导出中…' : '导出 Excel'}
        </Button>
        <Button variant="secondary" onClick={onExportJpg} disabled={exporting}>
          {exporting ? '导出中…' : '导出图片'}
        </Button>
        <Button variant="secondary" onClick={onPreview}>
          预览排班
        </Button>
        <Button onClick={onSave} disabled={saving || !dirty}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>
    </div>
  );
}
