import { useEffect, useState } from 'react';
import type { Assignment, Meeting } from '../../types/schedule';
import type { Employee } from '../../types/employee';
import type { ScheduleEvent } from '../../types/scheduleEvent';
import { ScheduleExportView } from './ScheduleExportView';

interface Props {
  open: boolean;
  onClose: () => void;
  deptName: string;
  weekStart: string;
  dates: string[];
  assignments: Assignment[];
  meetings: Meeting[];
  notice: string;
  events: ScheduleEvent[];
  empMap: Map<number, Employee>;
}

export function SchedulePreviewModal({
  open,
  onClose,
  deptName,
  weekStart,
  dates,
  assignments,
  meetings,
  notice,
  events,
  empMap,
}: Props) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setZoom(100);
  }, [open]);

  if (!open) return null;

  const zoomIn = () => setZoom((z) => Math.min(z + 20, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 20, 40));

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      {/* Toolbar */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-300 bg-white px-5 py-2 shadow">
        <h2 className="text-base font-semibold text-gray-800">排班预览</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-gray-300 bg-gray-50">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 40}
              className="px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[48px] text-center text-xs font-mono text-gray-700">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 200}
              className="px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 overflow-auto bg-gray-200 p-6">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <ScheduleExportView
            deptName={deptName}
            weekStart={weekStart}
            dates={dates}
            assignments={assignments}
            meetings={meetings}
            notice={notice}
            events={events}
            empMap={empMap}
          />
        </div>
      </div>
    </div>
  );
}
