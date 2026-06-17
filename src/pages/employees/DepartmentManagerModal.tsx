import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useDepartmentStore } from '../../stores/departmentStore';
import type { Department } from '../../types/department';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DraftRow {
  id?: number;
  name: string;
  description: string;
}

const EMPTY: DraftRow = { name: '', description: '' };

export function DepartmentManagerModal({ open, onClose }: Props) {
  const items = useDepartmentStore((s) => s.items);
  const fetchAll = useDepartmentStore((s) => s.fetchAll);
  const add = useDepartmentStore((s) => s.add);
  const update = useDepartmentStore((s) => s.update);
  const remove = useDepartmentStore((s) => s.remove);
  const countEmployees = useDepartmentStore((s) => s.countEmployees);

  const [draft, setDraft] = useState<DraftRow>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deleteHint, setDeleteHint] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchAll();
      setDraft(EMPTY);
      setError(null);
    }
  }, [open, fetchAll]);

  const isEditing = draft.id !== undefined;

  const handleSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      setError('部门名称必填');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        description: draft.description.trim() || null,
      };
      if (isEditing) {
        await update(draft.id!, payload);
      } else {
        await add(payload);
      }
      setDraft(EMPTY);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskDelete = async (d: Department) => {
    const count = await countEmployees(d.id);
    setDeleting(d);
    setDeleteHint(
      count > 0
        ? `该部门下有 ${count} 名员工，删除后这些员工的部门将变为空。`
        : '该部门下无员工。'
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      if (draft.id === deleting.id) setDraft(EMPTY);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Modal
        open={open}
        title="部门管理"
        onClose={onClose}
        width={620}
        footer={<Button variant="secondary" onClick={onClose}>关闭</Button>}
      >
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-xs font-medium text-gray-500">
              {isEditing ? '编辑部门' : '新增部门'}
            </div>
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
              <Input
                placeholder="部门名称 *"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
              <Input
                placeholder="描述（可选）"
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={submitting} size="md">
                  {submitting ? '保存中…' : isEditing ? '保存' : '新增'}
                </Button>
                {isEditing && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setDraft(EMPTY)}
                  >
                    取消
                  </Button>
                )}
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
              暂无部门，使用上方表单新增
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">名称</th>
                    <th className="px-3 py-2 font-medium">描述</th>
                    <th className="px-3 py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">{d.name}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {d.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDraft({
                                id: d.id,
                                name: d.name,
                                description: d.description ?? '',
                              })
                            }
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAskDelete(d)}
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
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="删除部门"
        message={`确认删除部门 "${deleting?.name}"？${deleteHint}`}
        confirmText="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
