import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { HistoryToolbar } from './HistoryToolbar';
import { HistoryList } from './HistoryList';
import { HistoryDetail } from './HistoryDetail';
import { CopyScheduleModal } from './CopyScheduleModal';
import { useHistoryStore } from '../../stores/historyStore';
import { formatRange } from '../../utils/week';

export function History() {
  const items = useHistoryStore((s) => s.items);
  const filters = useHistoryStore((s) => s.filters);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const selectedId = useHistoryStore((s) => s.selectedId);
  const detail = useHistoryStore((s) => s.detail);
  const detailLoading = useHistoryStore((s) => s.detailLoading);
  const fetchAll = useHistoryStore((s) => s.fetchAll);
  const setFilters = useHistoryStore((s) => s.setFilters);
  const resetFilters = useHistoryStore((s) => s.resetFilters);
  const select = useHistoryStore((s) => s.select);
  const remove = useHistoryStore((s) => s.remove);
  const copyTo = useHistoryStore((s) => s.copyTo);

  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sourceItem = copySourceId
    ? items.find((i) => i.id === copySourceId) ?? null
    : null;
  const deletingItem = deleting
    ? items.find((i) => i.id === deleting) ?? null
    : null;

  const openCopy = (id: number) => {
    setCopySourceId(id);
    setCopyOpen(true);
  };

  const handleCopyConfirm = async (target_week_start: string) => {
    if (!copySourceId) return;
    const res = await copyTo(copySourceId, target_week_start);
    setFlash(
      `已复制到 ${formatRange(res.target_week_start)}${res.overwritten ? '（已覆盖原排班）' : ''}`
    );
    setTimeout(() => setFlash(null), 3000);
  };

  const handleConfirmDelete = async () => {
    if (deleting == null) return;
    await remove(deleting);
    setDeleting(null);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="历史排班"
        description="按周存档，只读查看 / 复制到新周 / 删除"
      />

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {flash && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {flash}
        </div>
      )}

      <div className="mb-3">
        <HistoryToolbar
          from={filters.from}
          to={filters.to}
          total={items.length}
          onChange={setFilters}
          onReset={resetFilters}
        />
      </div>

      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
        <div className="col-span-4 overflow-auto xl:col-span-3">
          <HistoryList
            items={items}
            loading={loading}
            selectedId={selectedId}
            onSelect={select}
            onCopy={openCopy}
            onDelete={setDeleting}
          />
        </div>
        <div className="col-span-8 overflow-auto xl:col-span-9">
          <HistoryDetail detail={detail} loading={detailLoading} />
        </div>
      </div>

      <CopyScheduleModal
        open={copyOpen}
        sourceWeekStart={sourceItem?.week_start ?? null}
        onClose={() => setCopyOpen(false)}
        onConfirm={handleCopyConfirm}
      />

      <ConfirmDialog
        open={deleting != null}
        title="删除历史排班"
        message={
          deletingItem
            ? `确认删除 ${formatRange(deletingItem.week_start)} 这一周的排班？关联的班次、会议会一并清除。`
            : ''
        }
        confirmText="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
