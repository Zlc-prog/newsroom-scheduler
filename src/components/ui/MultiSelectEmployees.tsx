import { useEffect } from 'react';
import { clsx } from 'clsx';
import { useEmployeeStore } from '../../stores/employeeStore';
import type { Employee } from '../../types/employee';

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
}

export function MultiSelectEmployees({ value, onChange }: Props) {
  const items = useEmployeeStore((s) => s.items);
  const loading = useEmployeeStore((s) => s.loading);
  const fetchAll = useEmployeeStore((s) => s.fetchAll);

  useEffect(() => {
    if (items.length === 0) fetchAll();
  }, [items.length, fetchAll]);

  const selected = new Set(value);

  const toggle = (id: number) => {
    if (selected.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const grouped = groupByDepartment(items);

  if (loading && items.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-400">
        加载员工列表中…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-xs text-gray-400">
        员工管理里还没有员工，请先去添加
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="space-y-3 p-3">
        {grouped.map(([dept, list]) => (
          <div key={dept}>
            <div className="mb-1.5 text-xs font-medium text-gray-500">
              {dept}
              <span className="ml-1 text-gray-400">({list.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((e) => {
                const checked = selected.has(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    className={clsx(
                      'h-7 rounded-full border px-3 text-xs transition-colors',
                      checked
                        ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    )}
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
        <span>
          已选 <span className="font-medium text-gray-700">{value.length}</span> /{' '}
          {items.length} 人
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-blue-600 hover:underline"
          >
            清空
          </button>
        )}
      </div>
    </div>
  );
}

function groupByDepartment(items: Employee[]): [string, Employee[]][] {
  const map = new Map<string, Employee[]>();
  for (const e of items) {
    const key = e.department_name || '未分配部门';
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === '未分配部门') return 1;
    if (b === '未分配部门') return -1;
    return a.localeCompare(b);
  });
}
