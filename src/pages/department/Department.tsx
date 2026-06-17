import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useScheduleEventStore } from '../../stores/scheduleEventStore';
import { ScheduleEventToolbar } from './ScheduleEventToolbar';
import { ScheduleEventTable } from './ScheduleEventTable';
import { ScheduleEventFormModal } from './ScheduleEventFormModal';
import type {
  ScheduleEvent,
  ScheduleEventInput,
} from '../../types/scheduleEvent';

export function Department() {
  const items = useScheduleEventStore((s) => s.items);
  const filters = useScheduleEventStore((s) => s.filters);
  const loading = useScheduleEventStore((s) => s.loading);
  const error = useScheduleEventStore((s) => s.error);
  const fetchAll = useScheduleEventStore((s) => s.fetchAll);
  const setFilters = useScheduleEventStore((s) => s.setFilters);
  const resetFilters = useScheduleEventStore((s) => s.resetFilters);
  const add = useScheduleEventStore((s) => s.add);
  const update = useScheduleEventStore((s) => s.update);
  const remove = useScheduleEventStore((s) => s.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [deleting, setDeleting] = useState<ScheduleEvent | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: ScheduleEvent) => {
    setEditing(e);
    setFormOpen(true);
  };

  const handleSubmit = async (input: ScheduleEventInput) => {
    if (editing) await update(editing.id, input);
    else await add(input);
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    await remove(deleting.id);
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader
        title="部门事项"
        description={`共 ${items.length} 条事项`}
        actions={<Button onClick={openCreate}>新增事项</Button>}
      />

      <ScheduleEventToolbar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <ScheduleEventTable
        data={items}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleting}
      />

      <ScheduleEventFormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除事项"
        message={`确认删除事项 "${deleting?.name}"？关联的员工映射会一并清除。`}
        confirmText="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
