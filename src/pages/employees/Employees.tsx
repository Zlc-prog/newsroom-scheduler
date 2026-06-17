import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useEmployeeStore } from '../../stores/employeeStore';
import { EmployeeTable } from './EmployeeTable';
import { EmployeeFormModal } from './EmployeeFormModal';
import { DepartmentManagerModal } from './DepartmentManagerModal';
import type { Employee, EmployeeInput } from '../../types/employee';

export function Employees() {
  const items = useEmployeeStore((s) => s.items);
  const loading = useEmployeeStore((s) => s.loading);
  const error = useEmployeeStore((s) => s.error);
  const fetchAll = useEmployeeStore((s) => s.fetchAll);
  const add = useEmployeeStore((s) => s.add);
  const update = useEmployeeStore((s) => s.update);
  const remove = useEmployeeStore((s) => s.remove);
  const patch = useEmployeeStore((s) => s.patch);
  const reorder = useEmployeeStore((s) => s.reorder);

  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(
      (e) =>
        e.name.toLowerCase().includes(kw) ||
        (e.department_name ?? '').toLowerCase().includes(kw)
    );
  }, [items, keyword]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setFormOpen(true);
  };

  const handleSubmit = async (input: EmployeeInput) => {
    if (editing) {
      await update(editing.id, input);
    } else {
      await add(input);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    await remove(deleting.id);
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader
        title="员工管理"
        description={`共 ${items.length} 名员工`}
        actions={
          <>
            <Input
              placeholder="搜索 姓名/部门"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64"
            />
            <Button variant="secondary" onClick={() => setDeptManagerOpen(true)}>
              管理部门
            </Button>
            <Button onClick={openCreate}>新增员工</Button>
          </>
        }
      />

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <EmployeeTable
        data={filtered}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleting}
        onToggle={(emp, key, value) => patch(emp, key, value)}
        onReorder={reorder}
      />

      <EmployeeFormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除员工"
        message={`确认删除员工 "${deleting?.name}"？此操作不可撤销。`}
        confirmText="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <DepartmentManagerModal
        open={deptManagerOpen}
        onClose={() => {
          setDeptManagerOpen(false);
          fetchAll();
        }}
      />
    </div>
  );
}
