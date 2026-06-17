import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import type { Employee, EmployeePatchKey } from '../../types/employee';

interface Props {
  data: Employee[];
  loading: boolean;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  onToggle: (current: Employee, key: EmployeePatchKey, value: number | string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function EmployeeTable({ data, loading, onEdit, onDelete, onToggle, onReorder }: Props) {
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
        暂无员工数据，点击右上角"新增员工"开始
      </div>
    );
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">部门</th>
              <th className="px-4 py-3 text-center font-medium">领导</th>
              <th className="px-4 py-3 text-center font-medium">初审</th>
              <th className="px-4 py-3 text-center font-medium">每周班次</th>
              <th className="px-4 py-3 text-center font-medium">仅中班</th>
              <th className="px-4 py-3 text-center font-medium">仅白班</th>
              <th className="px-4 py-3 text-center font-medium">在职</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <Droppable droppableId="employee-list">
            {(provided) => (
              <tbody
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="divide-y divide-gray-100"
              >
                {data.map((e, index) => (
                  <Draggable key={e.id} draggableId={String(e.id)} index={index}>
                    {(drag, snapshot) => (
                      <tr
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`transition-colors ${snapshot.isDragging ? 'bg-blue-50 shadow-md' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-3 py-3 text-center" {...drag.dragHandleProps}>
                          <span className="cursor-grab text-gray-300 select-none">⠿</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {e.department_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={e.is_leader === 1}
                            onChange={(v) => onToggle(e, 'is_leader', v ? 1 : 0)}
                            ariaLabel="是否领导"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={e.is_first_reviewer === 1}
                            onChange={(v) => onToggle(e, 'is_first_reviewer', v ? 1 : 0)}
                            ariaLabel="是否初审"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-gray-700">
                          {e.weekly_shifts}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={e.mid_shift_only === 1}
                            onChange={(v) => onToggle(e, 'mid_shift_only', v ? 1 : 0)}
                            ariaLabel="仅中班"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={e.day_shift_only === 1}
                            onChange={(v) => onToggle(e, 'day_shift_only', v ? 1 : 0)}
                            ariaLabel="仅白班"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={e.status === 'active'}
                            onChange={(v) => onToggle(e, 'status', v ? 'active' : 'inactive')}
                            ariaLabel="在职状态"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => onEdit(e)}>
                              编辑
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(e)}>
                              <span className="text-red-600">删除</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </table>
      </div>
    </DragDropContext>
  );
}
