import { create } from 'zustand';
import { scheduleService } from '../services/scheduleService';
import { scheduleEventService } from '../services/scheduleEventService';
import { autoScheduleWeek } from '../services/scheduleAlgorithm';
import { getWeekDates, getWeekStart, shiftWeek } from '../utils/week';
import type {
  Assignment,
  AssignmentRow,
  Meeting,
  MeetingRow,
  Schedule,
  ShiftType,
} from '../types/schedule';
import type { AutoScheduleConfig, AlgorithmWarning } from '../types/algorithm';

const DEFAULT_NOTICE = '请按时参加汇报会，做好OA交接';
const MAX_UNDO = 50;

interface UndoSnapshot {
  assignments: Assignment[];
  meetings: Meeting[];
  notice: string;
}

interface AddOneInput {
  date: string;
  shift_type: ShiftType;
  employee_id: number;
}

interface AddManyInput {
  shift_type: ShiftType;
  employee_id: number;
  dates: string[];
}

interface ScheduleState {
  schedule: Schedule | null;
  weekStart: string;
  assignments: Assignment[];
  meetings: Meeting[];
  notice: string;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error: string | null;
  undoStack: UndoSnapshot[];

  load: (weekStart: string) => Promise<void>;
  shiftWeek: (deltaWeeks: number) => Promise<void>;

  addAssignment: (input: AddOneInput) => void;
  addAssignments: (input: AddManyInput) => void;
  removeAssignment: (uid: string) => void;
  moveAssignment: (
    uid: string,
    targetDate: string,
    targetShift: ShiftType,
    targetIndex: number
  ) => void;
  toggleLock: (uid: string) => void;
  togglePlanner: (uid: string) => void;

  addMeeting: (date: string, name: string) => void;
  removeMeeting: (uid: string) => void;
  renameMeeting: (uid: string, name: string) => void;

  setNotice: (notice: string) => void;

  undo: () => void;

  autoSchedule: (config: AutoScheduleConfig) => Promise<AlgorithmWarning[]>;

  save: (options?: { clearUndo?: boolean }) => Promise<void>;
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

let tmpCounter = 0;
const newUid = (prefix: string) => `${prefix}-${++tmpCounter}`;

function rowToAssignment(r: AssignmentRow): Assignment {
  return {
    uid: `da-${r.id}`,
    id: r.id,
    date: r.date,
    shift_type: r.shift_type,
    employee_id: r.employee_id,
    position: r.position,
    locked: r.locked,
    is_planner: r.is_planner,
  };
}

function rowToMeeting(r: MeetingRow): Meeting {
  return { uid: `dm-${r.id}`, id: r.id, date: r.date, name: r.name, position: r.position };
}

function bucketKey(a: Assignment): string {
  return `${a.date}|${a.shift_type}`;
}

function repositionWithin(items: Assignment[]): Assignment[] {
  return items.map((a, idx) => ({ ...a, position: idx }));
}

function groupByCell(list: Assignment[]): Map<string, Assignment[]> {
  const m = new Map<string, Assignment[]>();
  for (const a of list) {
    const k = bucketKey(a);
    const arr = m.get(k) ?? [];
    arr.push(a);
    m.set(k, arr);
  }
  for (const [k, arr] of m) {
    m.set(k, [...arr].sort((x, y) => x.position - y.position));
  }
  return m;
}

function flatten(m: Map<string, Assignment[]>): Assignment[] {
  const out: Assignment[] = [];
  for (const arr of m.values()) out.push(...arr);
  return out;
}

function seedTuesdayMeetingIfEmpty(
  weekStart: string,
  existing: Meeting[]
): Meeting[] {
  if (existing.length > 0) return existing;
  const dates = getWeekDates(weekStart);
  const tuesday = dates[1];
  if (!tuesday) return existing;
  return [
    {
      uid: newUid('tm'),
      id: 0,
      date: tuesday,
      name: '例会',
      position: 0,
    },
  ];
}

function deepCloneAssignments(list: Assignment[]): Assignment[] {
  return list.map((a) => ({ ...a }));
}

function deepCloneMeetings(list: Meeting[]): Meeting[] {
  return list.map((m) => ({ ...m }));
}

function pushUndo(s: { assignments: Assignment[]; meetings: Meeting[]; notice: string; undoStack: UndoSnapshot[] }): UndoSnapshot[] {
  const stack = [...s.undoStack];
  if (stack.length >= MAX_UNDO) stack.shift();
  stack.push({
    assignments: deepCloneAssignments(s.assignments),
    meetings: deepCloneMeetings(s.meetings),
    notice: s.notice,
  });
  return stack;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedule: null,
  weekStart: getWeekStart(),
  assignments: [],
  meetings: [],
  notice: DEFAULT_NOTICE,
  loading: false,
  saving: false,
  dirty: false,
  error: null,
  undoStack: [],

  async load(weekStart) {
    set({ loading: true, error: null, weekStart });
    try {
      const schedule = await scheduleService.getOrCreate(weekStart);
      const [aRows, mRows] = await Promise.all([
        scheduleService.listAssignments(schedule.id),
        scheduleService.listMeetings(schedule.id),
      ]);
      const loadedMeetings = mRows.map(rowToMeeting);
      const meetings = seedTuesdayMeetingIfEmpty(weekStart, loadedMeetings);
      const seededDirty = meetings.length !== loadedMeetings.length;
      set({
        schedule,
        assignments: aRows.map(rowToAssignment),
        meetings,
        notice: schedule.notice || DEFAULT_NOTICE,
        loading: false,
        dirty: seededDirty,
        undoStack: [],
      });
    } catch (e) {
      set({ loading: false, error: toErrorMessage(e) });
    }
  },

  async shiftWeek(deltaWeeks) {
    const cur = get().weekStart;
    const { shiftWeek } = await import('../utils/week');
    await get().load(shiftWeek(cur, deltaWeeks));
  },

  addAssignment({ date, shift_type, employee_id }) {
    if (shift_type === 'meeting') return;
    const s = get();
    const list = s.assignments;
    const same = list.filter(
      (a) => a.date === date && a.shift_type === shift_type
    );
    if (same.some((a) => a.employee_id === employee_id)) return;
    const next: Assignment = {
      uid: newUid('ta'),
      id: 0,
      date,
      shift_type,
      employee_id,
      position: same.length,
      locked: 0,
      is_planner: 0,
    };
    set({ assignments: [...list, next], dirty: true, undoStack: pushUndo(s) });
  },

  addAssignments({ shift_type, employee_id, dates }) {
    if (shift_type === 'meeting' || dates.length === 0) return;
    const s = get();
    const list = [...s.assignments];
    let changed = false;
    const grouped = groupByCell(list);
    for (const d of dates) {
      const key = `${d}|${shift_type}`;
      const arr = grouped.get(key) ?? [];
      if (arr.some((a) => a.employee_id === employee_id)) continue;
      arr.push({
        uid: newUid('ta'),
        id: 0,
        date: d,
        shift_type,
        employee_id,
        position: arr.length,
        locked: 0,
        is_planner: 0,
      });
      grouped.set(key, arr);
      changed = true;
    }
    if (!changed) return;
    set({ assignments: flatten(grouped), dirty: true, undoStack: pushUndo(s) });
  },

  removeAssignment(uid) {
    const s = get();
    const list = s.assignments;
    const target = list.find((a) => a.uid === uid);
    if (!target || target.locked === 1) return;
    const remaining = list.filter((a) => a.uid !== uid);
    const grouped = groupByCell(remaining);
    const key = bucketKey(target);
    grouped.set(key, repositionWithin(grouped.get(key) ?? []));
    set({ assignments: flatten(grouped), dirty: true, undoStack: pushUndo(s) });
  },

  moveAssignment(uid, targetDate, targetShift, targetIndex) {
    if (targetShift === 'meeting') return;
    const s = get();
    const list = s.assignments;
    const target = list.find((a) => a.uid === uid);
    if (!target || target.locked === 1) return;

    const targetKey = `${targetDate}|${targetShift}`;
    const sourceKey = bucketKey(target);
    const grouped = groupByCell(list);
    const sourceList = [...(grouped.get(sourceKey) ?? [])];
    const sourceIdx = sourceList.findIndex((a) => a.uid === uid);
    if (sourceIdx < 0) return;
    sourceList.splice(sourceIdx, 1);

    if (sourceKey === targetKey) {
      sourceList.splice(targetIndex, 0, target);
      grouped.set(sourceKey, repositionWithin(sourceList));
    } else {
      const destList = [...(grouped.get(targetKey) ?? [])];
      if (destList.some((a) => a.employee_id === target.employee_id)) return;
      destList.splice(targetIndex, 0, {
        ...target,
        date: targetDate,
        shift_type: targetShift,
      });
      grouped.set(sourceKey, repositionWithin(sourceList));
      grouped.set(targetKey, repositionWithin(destList));
    }
    set({ assignments: flatten(grouped), dirty: true, undoStack: pushUndo(s) });
  },

  toggleLock(uid) {
    const s = get();
    const list = s.assignments.map((a) =>
      a.uid === uid ? { ...a, locked: (a.locked ? 0 : 1) as 0 | 1 } : a
    );
    set({ assignments: list, dirty: true, undoStack: pushUndo(s) });
  },

  togglePlanner(uid) {
    const s = get();
    const list = s.assignments.map((a) =>
      a.uid === uid
        ? { ...a, is_planner: (a.is_planner ? 0 : 1) as 0 | 1 }
        : a
    );
    set({ assignments: list, dirty: true, undoStack: pushUndo(s) });
  },

  addMeeting(date, name) {
    const s = get();
    const list = s.meetings;
    const sameDay = list.filter((m) => m.date === date);
    const next: Meeting = {
      uid: newUid('tm'),
      id: 0,
      date,
      name: name.trim() || '会议',
      position: sameDay.length,
    };
    set({ meetings: [...list, next], dirty: true, undoStack: pushUndo(s) });
  },

  removeMeeting(uid) {
    const s = get();
    const list = s.meetings;
    const target = list.find((m) => m.uid === uid);
    if (!target) return;
    const remaining = list.filter((m) => m.uid !== uid);
    const sameDay = remaining
      .filter((m) => m.date === target.date)
      .sort((a, b) => a.position - b.position);
    const repositioned = remaining.map((m) => {
      if (m.date !== target.date) return m;
      const idx = sameDay.findIndex((x) => x.uid === m.uid);
      return { ...m, position: idx };
    });
    set({ meetings: repositioned, dirty: true, undoStack: pushUndo(s) });
  },

  renameMeeting(uid, name) {
    const s = get();
    const list = s.meetings.map((m) =>
      m.uid === uid ? { ...m, name: name.trim() || m.name } : m
    );
    set({ meetings: list, dirty: true, undoStack: pushUndo(s) });
  },

  setNotice(notice) {
    const { assignments, meetings, notice: oldNotice, undoStack } = get();
    if (undoStack.length >= MAX_UNDO) undoStack.shift();
    undoStack.push({
      assignments: deepCloneAssignments(assignments),
      meetings: deepCloneMeetings(meetings),
      notice: oldNotice,
    });
    set({ notice, dirty: true, undoStack: [...undoStack] });
  },

  undo() {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const snapshot = undoStack[undoStack.length - 1];
    set({
      assignments: snapshot.assignments,
      meetings: snapshot.meetings,
      notice: snapshot.notice,
      undoStack: undoStack.slice(0, -1),
      dirty: true,
    });
  },

  async autoSchedule(config) {
    const { weekStart, assignments } = get();
    const locked = assignments.filter((a) => a.locked === 1);

    // load employees
    const { useEmployeeStore } = await import('./employeeStore');
    const empState = useEmployeeStore.getState();
    if (empState.items.length === 0) await empState.fetchAll();
    const employees = useEmployeeStore.getState().items;

    const allWarnings: AlgorithmWarning[] = [];

    // run for each requested week
    let prevWeekAssignments: Assignment[] = [];

    // For week 0, load last week's saved assignments from DB so cross-week
    // constraints (weekend rest, consecutive days, sun-mid→mon-day) are accurate.
    {
      const prevWs = shiftWeek(weekStart, -1);
      try {
        const prevSched = await scheduleService.getOrCreate(prevWs);
        const prevRows = await scheduleService.listAssignments(prevSched.id);
        prevWeekAssignments = prevRows.map(rowToAssignment);
      } catch {
        // If previous week has no record yet, start with empty — constraints
        // simply won't apply, which is the correct behaviour for a first week.
      }
    }

    for (let w = 0; w < config.weekCount; w++) {
      const ws = w === 0 ? weekStart : shiftWeek(weekStart, w);
      const weekDates = getWeekDates(ws);
      const weekEnd = weekDates[6] ?? ws;

      // events overlapping this week
      const events = await scheduleEventService.list({ type: '', from: ws, to: weekEnd });

      // locked assignments for this week (only for w=0, subsequent weeks start fresh)
      const weekLocked = w === 0 ? locked : [];

      const result = autoScheduleWeek(weekDates, employees, events, weekLocked, config, prevWeekAssignments);
      allWarnings.push(...result.warnings);

      if (w === 0) {
        // replace non-locked assignments for current week in store
        const s = get();
        const newList: Assignment[] = [
          ...locked,
          ...result.assignments.map((a) => ({
            uid: newUid('aa'),
            id: 0,
            ...a,
          })),
        ];
        set({ assignments: newList, dirty: true, undoStack: pushUndo(s) });
      } else {
        // for future weeks: load schedule, save with new assignments
        const schedule = await scheduleService.getOrCreate(ws);
        const aRows = await scheduleService.listAssignments(schedule.id);
        const existingLocked = aRows.filter((r) => r.locked === 1).map(rowToAssignment);
        const allNew: Assignment[] = [
          ...existingLocked,
          ...result.assignments.map((a) => ({
            uid: newUid('aa'),
            id: 0,
            ...a,
          })),
        ];
        const mRows = await scheduleService.listMeetings(schedule.id);
        const aPayload = allNew.map((a) => ({
          id: a.id,
          date: a.date,
          shift_type: a.shift_type,
          employee_id: a.employee_id,
          position: a.position,
          locked: a.locked,
          is_planner: a.is_planner,
        }));
        const mPayload = mRows.map((m) => ({
          id: m.id,
          date: m.date,
          name: m.name,
          position: m.position,
        }));
        await scheduleService.save({
          week_start: ws,
          notice: schedule.notice || DEFAULT_NOTICE,
          assignments: aPayload,
          meetings: mPayload,
        });
      }

      prevWeekAssignments = result.assignments.map((a) => ({
        uid: 'prev',
        id: 0,
        ...a,
      }));
    }

    return allWarnings;
  },

  async save(options?: { clearUndo?: boolean }) {
    const clearUndo = options?.clearUndo ?? true;
    set({ saving: true, error: null });
    try {
      const { weekStart, assignments, meetings, notice } = get();
      const aPayload = assignments.map((a) => ({
        id: a.id,
        date: a.date,
        shift_type: a.shift_type,
        employee_id: a.employee_id,
        position: a.position,
        locked: a.locked,
        is_planner: a.is_planner,
      }));
      const mPayload = meetings.map((m) => ({
        id: m.id,
        date: m.date,
        name: m.name,
        position: m.position,
      }));
      const { schedule, assignmentRows, meetingRows } = await scheduleService.save({
        week_start: weekStart,
        notice,
        assignments: aPayload,
        meetings: mPayload,
      });
      set({
        schedule,
        assignments: assignmentRows.map(rowToAssignment),
        meetings: meetingRows.map(rowToMeeting),
        notice: schedule.notice || DEFAULT_NOTICE,
        dirty: false,
        saving: false,
        undoStack: clearUndo ? [] : get().undoStack,
      });
    } catch (e) {
      set({ saving: false, error: toErrorMessage(e) });
      throw e;
    }
  },
}));
