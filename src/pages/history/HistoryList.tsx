import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import { formatRange } from '../../utils/week';
import type { ScheduleSummary } from '../../types/schedule';

interface Props {
  items: ScheduleSummary[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCopy: (id: number) => void;
  onDelete: (id: number) => void;
}

export function HistoryList({
  items,
  loading,
  selectedId,
  onSelect,
  onCopy,
  onDelete,
}: Props) {
  const columns = useMemo(() => {
    const helper = createColumnHelper<ScheduleSummary>();
    return [
      helper.accessor('week_start', {
        header: '周区间',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm text-gray-800">
              {formatRange(info.getValue())}
            </span>
            <span className="text-[11px] text-gray-400">
              更新 {info.row.original.updated_at}
            </span>
          </div>
        ),
      }),
      helper.accessor('assignment_count', {
        header: '班次',
        cell: (info) => (
          <span className="text-xs text-gray-600">
            {info.getValue()}
            <span className="ml-1 text-gray-400">
              / 会议 {info.row.original.meeting_count}
            </span>
          </span>
        ),
      }),
      helper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(row.original.id);
              }}
              className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50"
            >
              复制
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original.id);
              }}
              className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
            >
              删除
            </button>
          </div>
        ),
      }),
    ];
  }, [onCopy, onDelete]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading && items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-400">
        加载中…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-sm text-gray-400">
        无历史排班
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-[11px] uppercase text-gray-500">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 font-medium">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.map((row) => {
            const active = row.original.id === selectedId;
            return (
              <tr
                key={row.id}
                onClick={() => onSelect(row.original.id)}
                className={clsx(
                  'cursor-pointer transition-colors',
                  active ? 'bg-blue-50' : 'hover:bg-gray-50'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
