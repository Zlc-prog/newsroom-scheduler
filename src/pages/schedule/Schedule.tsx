import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toJpeg } from 'html-to-image';
import { invoke } from '@tauri-apps/api/core';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import dayjs from 'dayjs';
import { ScheduleHeader } from './ScheduleHeader';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleExportView } from './ScheduleExportView';
import { EmployeePickerModal } from './EmployeePickerModal';
import { AutoScheduleModal } from './AutoScheduleModal';
import { SideStaff } from './SideStaff';
import { ScheduleNotice } from './ScheduleNotice';
import { useScheduleStore } from '../../stores/scheduleStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useScheduleEventStore } from '../../stores/scheduleEventStore';
import { getWeekDates, getWeekStart } from '../../utils/week';
import { type ShiftType, NIGHT_SHIFT_TYPES } from '../../types/schedule';
import type { AutoScheduleConfig, AlgorithmWarning } from '../../types/algorithm';
import { detectSaveRisks } from '../../services/riskDetection';
import { SaveRiskModal } from './SaveRiskModal';
import { EmployeeWeekModal } from './EmployeeWeekModal';
import { SchedulePreviewModal } from './SchedulePreviewModal';

export function Schedule() {
  const weekStart = useScheduleStore((s) => s.weekStart);
  const assignments = useScheduleStore((s) => s.assignments);
  const meetings = useScheduleStore((s) => s.meetings);
  const notice = useScheduleStore((s) => s.notice);
  const loading = useScheduleStore((s) => s.loading);
  const saving = useScheduleStore((s) => s.saving);
  const dirty = useScheduleStore((s) => s.dirty);
  const error = useScheduleStore((s) => s.error);
  const load = useScheduleStore((s) => s.load);
  const shiftWeek = useScheduleStore((s) => s.shiftWeek);
  const addAssignments = useScheduleStore((s) => s.addAssignments);
  const removeAssignment = useScheduleStore((s) => s.removeAssignment);
  const moveAssignment = useScheduleStore((s) => s.moveAssignment);
  const toggleLock = useScheduleStore((s) => s.toggleLock);
  const togglePlanner = useScheduleStore((s) => s.togglePlanner);
  const addMeeting = useScheduleStore((s) => s.addMeeting);
  const renameMeeting = useScheduleStore((s) => s.renameMeeting);
  const removeMeeting = useScheduleStore((s) => s.removeMeeting);
  const setNotice = useScheduleStore((s) => s.setNotice);
  const save = useScheduleStore((s) => s.save);
  const undoStack = useScheduleStore((s) => s.undoStack);
  const undo = useScheduleStore((s) => s.undo);

  const autoSchedule = useScheduleStore((s) => s.autoSchedule);

  const employees = useEmployeeStore((s) => s.items);
  const fetchEmployees = useEmployeeStore((s) => s.fetchAll);
  const scheduleEvents = useScheduleEventStore((s) => s.items);

  const exportRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState('');
  const [pickerShift, setPickerShift] = useState<ShiftType | null>(null);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleWarnings, setScheduleWarnings] = useState<AlgorithmWarning[]>([]);
  const [activeNightShifts, setActiveNightShifts] = useState<ShiftType[]>([]);
  const [saveRisks, setSaveRisks] = useState<AlgorithmWarning[]>([]);
  const [showSaveRiskModal, setShowSaveRiskModal] = useState(false);
  const [previewEmpId, setPreviewEmpId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  useEffect(() => {
    load(weekStart);
    if (employees.length === 0) fetchEmployees();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) {
      setActiveNightShifts(
        NIGHT_SHIFT_TYPES.filter((t) => assignments.some((a) => a.shift_type === t))
      );
    }
  }, [weekStart, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: 2-second debounce after any dirty change, bypasses risk detection
  useEffect(() => {
    if (!dirty || loading || scheduling) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      return;
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      autoSaveTimer.current = null;
      try {
        await save({ clearUndo: false });
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2500);
      } catch { /* error already in store */ }
    }, 2000);
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [dirty, loading, scheduling, save]); // eslint-disable-line react-hooks/exhaustive-deps

  const empMap = useMemo(() => {
    const m = new Map<number, (typeof employees)[number]>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const dates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = dates[6] ?? weekStart;

  const employeeNameOf = (id: number) => empMap.get(id)?.name ?? `员工${id}`;

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const [date, shift] = r.destination.droppableId.split('|') as [string, ShiftType];
    moveAssignment(r.draggableId, date, shift, r.destination.index);
  };

  const openPicker = (date: string, shift: ShiftType) => {
    setPickerDate(date);
    setPickerShift(shift);
    setPickerOpen(true);
  };

  const isExcluded = (date: string, employeeId: number) => {
    if (!pickerShift) return false;
    return assignments.some(
      (a) =>
        a.date === date &&
        a.shift_type === pickerShift &&
        a.employee_id === employeeId
    );
  };

  const handleAddNightShift = (shift: ShiftType) =>
    setActiveNightShifts((prev) => (prev.includes(shift) ? prev : [...prev, shift]));

  const handlePickMany = (employee_id: number, targetDates: string[]) => {
    if (!pickerShift) return;
    addAssignments({ shift_type: pickerShift, employee_id, dates: targetDates });
  };

  const handleAutoScheduleConfirm = async (config: AutoScheduleConfig) => {
    setAutoModalOpen(false);
    setScheduling(true);
    setScheduleWarnings([]);
    try {
      const warnings = await autoSchedule(config);
      setScheduleWarnings(warnings);
    } catch (e) {
      /* error in store */
    } finally {
      setScheduling(false);
    }
  };

  const deptName = employees[0]?.department_name ?? '排班表';

  const handleExportJpg = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    setExportSuccess(false);
    try {
      const dataUrl = await toJpeg(exportRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      // Convert base64 data URL to byte array
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const s = dayjs(weekStart).format('M月D日');
      const e = dayjs(weekEnd).format('M月D日');
      const filename = `${deptName}编辑排班 ${s}-${e}.jpg`;
      const saved = await invoke<boolean>('save_file', {
        data: Array.from(bytes),
        filename,
      });
      if (saved) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async () => {
    // Shift code mapping (per-employee-per-day format)
    const SHIFT_CODE: Record<string, string> = {
      day: '白', mid: '中', topic: '专题', night: '大夜', night_small: '小夜', night_mid: '中夜',
    };

    // Event type → display abbreviation
    const eventCode = (type: string, name: string): string => {
      if (type === 'business_trip') return '差';
      return name; // use full event name for training / other
    };

    // Employee label: append（初审）for first reviewers
    const empLabel = (emp: (typeof employees)[number]) =>
      emp.is_first_reviewer === 1 ? `${emp.name}（初审）` : emp.name;

    // Header: dept name + weekday names
    const header = [deptName, '一', '二', '三', '四', '五', '六', '日'];
    const rows: string[][] = [header];

    for (const emp of employees.filter((e) => e.status === 'active')) {
      // Build date → first applicable event lookup for this employee
      const eventByDate: Record<string, { type: string; name: string; block_scheduling: number }> = {};
      for (const evt of scheduleEvents) {
        if (!evt.employee_ids.includes(emp.id)) continue;
        for (const d of dates) {
          if (d >= evt.start_date && d <= evt.end_date && !eventByDate[d]) {
            eventByDate[d] = { type: evt.type, name: evt.name, block_scheduling: evt.block_scheduling };
          }
        }
      }

      // Compute raw cell value for each day
      const cells: string[] = dates.map((d) => {
        const mainShift = assignments.find(
          (a) =>
            a.date === d &&
            a.employee_id === emp.id &&
            (a.shift_type === 'day' || a.shift_type === 'mid' ||
             a.shift_type === 'topic' || a.shift_type === 'night' ||
             a.shift_type === 'night_small' || a.shift_type === 'night_mid')
        );
        const hasMeeting = meetings.some((m) => m.date === d);
        const evt = eventByDate[d];

        if (mainShift) {
          // Shift takes priority over events and meetings
          let code = SHIFT_CODE[mainShift.shift_type];
          const mods: string[] = [];
          // "(审)" when reviewer on day/mid shift
          if (
            emp.is_first_reviewer === 1 &&
            (mainShift.shift_type === 'day' || mainShift.shift_type === 'mid')
          ) {
            mods.push('审');
          }
          // "(策)" when acting as planner
          if (mainShift.is_planner === 1) mods.push('策');
          if (mods.length) code += `（${mods.join('/')}）`;
          if (hasMeeting) code += '/会';
          return code;
        }
        // No shift: blocking events take priority over meeting display
        if (evt && evt.block_scheduling === 1) return eventCode(evt.type, evt.name);
        if (hasMeeting) return '会';
        if (evt) return eventCode(evt.type, evt.name);
        return '休';
      });

      // 补休 rule: if exactly 3 plain-rest days, promote first weekday 休 → 补休
      const restCount = cells.filter((v) => v === '休').length;
      if (restCount === 3) {
        for (let i = 0; i < 5; i++) { // indices 0-4 = Mon-Fri
          if (cells[i] === '休') { cells[i] = '补休'; break; }
        }
      }

      rows.push([empLabel(emp), ...cells]);
    }

    // Build worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wpx: 130 },                            // employee name column
      ...Array(7).fill({ wpx: 82 }) as object[], // Mon–Sun columns
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '排班');
    const s = dayjs(weekStart).format('MMDD');
    const e = dayjs(weekEnd).format('MMDD');
    const filename = `（${deptName}）${s}-${e}排班表.xlsx`;

    setExcelExporting(true);
    setExcelSuccess(false);
    try {
      const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      const buf = new Uint8Array(raw);
      const saved = await invoke<boolean>('save_file', {
        data: Array.from(buf),
        filename,
      });
      if (saved) {
        setExcelSuccess(true);
        setTimeout(() => setExcelSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExcelExporting(false);
    }
  };

  const onSaveClick = async () => {
    try {
      const risks = await detectSaveRisks(weekStart, assignments, [...empMap.values()]);
      if (risks.length > 0) {
        setSaveRisks(risks);
        setShowSaveRiskModal(true);
        return;
      }
      await save();
    } catch {
      /* error already in store */
    }
  };

  const handleConfirmSave = async () => {
    setShowSaveRiskModal(false);
    try {
      await save();
    } catch {
      /* error already in store */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScheduleHeader
        weekStart={weekStart}
        dirty={dirty}
        saving={saving}
        loading={loading}
        scheduling={scheduling}
        exporting={exporting}
        excelExporting={excelExporting}
        onPrevWeek={() => shiftWeek(-1)}
        onNextWeek={() => shiftWeek(1)}
        onToday={() => load(getWeekStart(dayjs()))}
        onAutoSchedule={() => setAutoModalOpen(true)}
        onSave={onSaveClick}
        onExport={handleExport}
        onExportJpg={handleExportJpg}
        autoSaved={autoSaved}
        canUndo={undoStack.length > 0}
        onUndo={undo}
        onPreview={() => setPreviewOpen(true)}
      />

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {exportSuccess && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          图片已保存成功 ✓
        </div>
      )}

      {excelSuccess && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Excel 已保存成功 ✓
        </div>
      )}

      {scheduleWarnings.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <div className="mb-1 font-medium">智能排班完成，有 {scheduleWarnings.length} 条提示：</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {scheduleWarnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-1 text-amber-600 underline hover:text-amber-800"
            onClick={() => setScheduleWarnings([])}
          >
            关闭
          </button>
        </div>
      )}

      <div className="max-w-[840px]">
        <DragDropContext onDragEnd={onDragEnd}>
          <ScheduleGrid
            dates={dates}
            assignments={assignments}
            meetings={meetings}
            employees={empMap}
            activeNightShifts={activeNightShifts}
            onAddClick={openPicker}
            onRemove={removeAssignment}
            onToggleLock={toggleLock}
            onTogglePlanner={togglePlanner}
            onAddMeeting={addMeeting}
            onRenameMeeting={renameMeeting}
            onRemoveMeeting={removeMeeting}
            onAddNightShift={handleAddNightShift}
            onEmployeeDoubleClick={setPreviewEmpId}
          />
        </DragDropContext>

        <ScheduleNotice value={notice} onChange={setNotice} />

        <SideStaff
          weekStart={weekStart}
          weekEnd={weekEnd}
          employeeNameOf={employeeNameOf}
        />
      </div>

      <EmployeePickerModal
        open={pickerOpen}
        weekStart={weekStart}
        defaultDate={pickerDate}
        shift={pickerShift}
        isExcluded={isExcluded}
        onClose={() => setPickerOpen(false)}
        onPickMany={handlePickMany}
      />

      <AutoScheduleModal
        open={autoModalOpen}
        weekStart={weekStart}
        employees={employees}
        onClose={() => setAutoModalOpen(false)}
        onConfirm={handleAutoScheduleConfirm}
      />

      <SaveRiskModal
        open={showSaveRiskModal}
        risks={saveRisks}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowSaveRiskModal(false)}
      />

      <EmployeeWeekModal
        open={previewEmpId !== null}
        employee={previewEmpId !== null ? (empMap.get(previewEmpId) ?? null) : null}
        dates={dates}
        assignments={assignments}
        onClose={() => setPreviewEmpId(null)}
      />

      <SchedulePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        deptName={deptName}
        weekStart={weekStart}
        dates={dates}
        assignments={assignments}
        meetings={meetings}
        notice={notice}
        events={scheduleEvents}
        empMap={empMap}
      />

      {/* Hidden off-screen export view */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <ScheduleExportView
          ref={exportRef}
          deptName={deptName}
          weekStart={weekStart}
          dates={dates}
          assignments={assignments}
          meetings={meetings}
          notice={notice}
          events={scheduleEvents}
          empMap={empMap}
        />
      </div>
    </div>
  );
}
