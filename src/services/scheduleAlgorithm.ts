import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { Employee } from '../types/employee';
import type { ScheduleEvent } from '../types/scheduleEvent';
import type { Assignment, ShiftType } from '../types/schedule';
import type {
  AutoScheduleConfig,
  AlgorithmResult,
  AlgorithmWarning,
  NewAssignment,
} from '../types/algorithm';

dayjs.extend(isoWeek);

const REST_RISK_SHIFTS_ALG = new Set<ShiftType>(['mid', 'night', 'night_small', 'night_mid']);
const WORK_SHIFTS_ALG = new Set<ShiftType>(['day', 'mid', 'night', 'night_small', 'night_mid']);

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildBlockMap(
  events: ScheduleEvent[],
  weekDates: string[]
): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const d of weekDates) map.set(d, new Set());

  for (const evt of events) {
    if (!evt.block_scheduling) continue;
    for (const d of weekDates) {
      if (d >= evt.start_date && d <= evt.end_date) {
        for (const id of evt.employee_ids) map.get(d)!.add(id);
      }
    }
  }
  return map;
}

function buildDayOffMap(
  requests: AutoScheduleConfig['dayOffRequests'],
  weekDates: string[]
): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const d of weekDates) map.set(d, new Set());
  for (const req of requests) {
    for (const d of req.dates) {
      if (map.has(d)) map.get(d)!.add(req.employeeId);
    }
  }
  return map;
}

/**
 * Phase 0: Pre-assign each employee's working days for the week.
 *
 * Uses a greedy bin-packing approach: each assignment goes to the
 * least-loaded available day. This guarantees balanced daily headcounts
 * across all 7 days including weekends.
 *
 * Priority order (most constrained first):
 *   1. Leaders      → weekdays only
 *   2. Config planners → their specified dates first, then weekdays, then weekends
 *   3. Other reviewers → weekdays preferred, then weekends
 *   4. Everyone else → any day, least-loaded first
 */
function preAssignDays(
  weekDates: string[],
  active: Employee[],
  blockMap: Map<string, Set<number>>,
  dayOffMap: Map<string, Set<number>>,
  lockedByDate: Map<string, Assignment[]>,
  config: AutoScheduleConfig,
  prevSunMidNightIds: Set<number>,
  prevWeekendBothIds: Set<number>,
  // Number of consecutive work days at the tail of last week, keyed by employee id.
  // Used to prevent back-to-back runs across the week boundary.
  prevTailWorkDays: Map<number, number>
): Map<number, Set<string>> {
  const dayLoad = new Map<string, number>();
  const empDays = new Map<number, Set<string>>();

  for (const d of weekDates) dayLoad.set(d, 0);
  for (const e of active) empDays.set(e.id, new Set());

  // Seed with locked day/mid assignments
  for (const [d, locked] of lockedByDate) {
    for (const a of locked) {
      if (a.shift_type === 'day' || a.shift_type === 'mid') {
        dayLoad.set(d, (dayLoad.get(d) ?? 0) + 1);
        empDays.get(a.employee_id)?.add(d);
      }
    }
  }

  const monDate = weekDates.find(d => dayjs(d).isoWeekday() === 1) ?? '';

  const canWork = (empId: number, date: string) => {
    if (empDays.get(empId)?.has(date)) return false;
    if ((blockMap.get(date) ?? new Set()).has(empId)) return false;
    if ((dayOffMap.get(date) ?? new Set()).has(empId)) return false;
    // Day-shift-only employees who had mid/night last Sunday cannot work Monday
    // (they have no valid shift available that day)
    const emp = active.find(e => e.id === empId);
    if (emp?.day_shift_only === 1 && prevSunMidNightIds.has(empId) && date === monDate) return false;
    // Two-weekend cap: if employee worked both weekend days last week,
    // allow at most 1 weekend day this week (2 prev + 1 curr = 3 total max).
    if (prevWeekendBothIds.has(empId) && dayjs(date).isoWeekday() >= 6) {
      const alreadyHasWeekendDay = [...(empDays.get(empId) ?? [])].some(
        d => dayjs(d).isoWeekday() >= 6
      );
      if (alreadyHasWeekendDay) return false;
    }
    // Cross-week consecutive cap: prevent total run > 5 across the week boundary.
    // Count how many consecutive days from the START of weekDates are already assigned.
    const tail = prevTailWorkDays.get(empId) ?? 0;
    if (tail > 0) {
      let currStreak = 0;
      for (const d of weekDates) {
        if (empDays.get(empId)?.has(d)) currStreak++;
        else break;
      }
      // If this date would extend that front streak and total would exceed 5, block it.
      if (date === weekDates[currStreak] && tail + currStreak + 1 > 5) return false;
    }
    return true;
  };

  const weekdays = weekDates.filter((d) => dayjs(d).isoWeekday() <= 5);

  // Assign employee to the N least-loaded available days from the given pool.
  // Re-evaluates canWork after each addition so dynamic constraints (e.g. consecutive
  // day cap) are respected throughout, not just at the start of the call.
  const assign = (empId: number, n: number, pool: string[]) => {
    for (let i = 0; i < n; i++) {
      const best = pool
        .filter((d) => canWork(empId, d))
        .sort((a, b) => (dayLoad.get(a) ?? 0) - (dayLoad.get(b) ?? 0))[0];
      if (!best) break;
      empDays.get(empId)!.add(best);
      dayLoad.set(best, (dayLoad.get(best) ?? 0) + 1);
    }
  };

  // 1. Leaders: weekdays only
  for (const e of active.filter((x) => x.is_leader === 1)) {
    const used = empDays.get(e.id)!.size;
    assign(e.id, e.weekly_shifts - used, weekdays);
  }

  // 2. Config-specified planners: lock their specified dates, then fill with weekdays
  const configPlannerIds = new Set(config.plannerSchedule.map((p) => p.employeeId));
  for (const ps of config.plannerSchedule) {
    const e = active.find((x) => x.id === ps.employeeId);
    if (!e) continue;
    // Lock the specified dates first
    for (const d of ps.dates) {
      if (weekDates.includes(d) && canWork(e.id, d)) {
        empDays.get(e.id)!.add(d);
        dayLoad.set(d, (dayLoad.get(d) ?? 0) + 1);
      }
    }
    // Fill remaining quota: weekdays preferred, then weekends
    const used = empDays.get(e.id)!.size;
    if (used < e.weekly_shifts) assign(e.id, e.weekly_shifts - used, weekdays);
    const used2 = empDays.get(e.id)!.size;
    if (used2 < e.weekly_shifts) assign(e.id, e.weekly_shifts - used2, weekDates);
  }

  // 3 & 4. Remaining employees (sorted: most constrained first)
  const others = active.filter(
    (e) => e.is_leader === 0 && !configPlannerIds.has(e.id)
  );
  others.sort((a, b) => {
    // Reviewers before general (they prefer weekdays, assign them first for better weekday coverage)
    if (a.is_first_reviewer !== b.is_first_reviewer)
      return b.is_first_reviewer - a.is_first_reviewer;
    // Most constrained (fewer available days) first
    const availA = weekDates.filter((d) => canWork(a.id, d)).length;
    const availB = weekDates.filter((d) => canWork(b.id, d)).length;
    return availA - availB;
  });

  for (const e of others) {
    const used = empDays.get(e.id)!.size;
    if (used >= e.weekly_shifts) continue;
    const remaining = e.weekly_shifts - used;

    if (e.is_first_reviewer === 1) {
      // Reviewers: weekdays preferred
      assign(e.id, remaining, weekdays);
      const used2 = empDays.get(e.id)!.size;
      if (used2 < e.weekly_shifts) assign(e.id, e.weekly_shifts - used2, weekDates);
    } else {
      // General, mid-only, day-only: if worked both weekend days last week,
      // canWork already caps this week's weekend to 1 day; just prefer weekdays first.
      if (prevWeekendBothIds.has(e.id)) {
        assign(e.id, remaining, weekdays);
        const used2 = empDays.get(e.id)!.size;
        if (used2 < e.weekly_shifts) assign(e.id, e.weekly_shifts - used2, weekDates);
      } else {
        assign(e.id, remaining, weekDates);
      }
    }
  }

  return empDays;
}

interface EmpState {
  shiftsAssigned: number;
  assignedDates: Set<string>;
  weekendShiftsThisWeek: number;
  tuesdayShiftsThisWeek: number;
}

interface PrevWeekState {
  weekendShifts: number;
  tuesdayShifts: number;
  dayShifts: number;
  midShifts: number;
}

function fairnessScore(
  emp: Employee,
  date: string,
  state: EmpState,
  prev: PrevWeekState | undefined
): number {
  const remaining = emp.weekly_shifts - state.shiftsAssigned;
  let score = -remaining * 100;

  const dow = dayjs(date).isoWeekday();
  if (dow >= 6) {
    score += ((prev?.weekendShifts ?? 0) + state.weekendShiftsThisWeek) * 30;
  }
  if (dow === 2) {
    score += ((prev?.tuesdayShifts ?? 0) + state.tuesdayShiftsThisWeek) * 20;
  }
  return score;
}

// ─── main algorithm ────────────────────────────────────────────────────────────

export function autoScheduleWeek(
  weekDates: string[],
  employees: Employee[],
  events: ScheduleEvent[],
  lockedAssignments: Assignment[],
  config: AutoScheduleConfig,
  prevWeekAssignments: Assignment[] = []
): AlgorithmResult {
  const active = employees.filter((e) => e.status === 'active');
  const empMap = new Map<number, Employee>();
  for (const e of active) empMap.set(e.id, e);

  const blockMap = buildBlockMap(events, weekDates);
  const dayOffMap = buildDayOffMap(config.dayOffRequests, weekDates);

  // Map: employeeId → event names that block them (for blocked_employee warning)
  const blockReasonMap = new Map<number, string[]>();
  for (const evt of events) {
    if (!evt.block_scheduling) continue;
    for (const d of weekDates) {
      if (d >= evt.start_date && d <= evt.end_date) {
        for (const id of evt.employee_ids) {
          if (!blockReasonMap.has(id)) blockReasonMap.set(id, []);
          const names = blockReasonMap.get(id)!;
          if (!names.includes(evt.name)) names.push(evt.name);
        }
      }
    }
  }

  // ── employee state ──
  const state = new Map<number, EmpState>();
  for (const e of active) {
    state.set(e.id, {
      shiftsAssigned: 0,
      assignedDates: new Set(),
      weekendShiftsThisWeek: 0,
      tuesdayShiftsThisWeek: 0,
    });
  }

  // prev week fairness counters
  const prevState = new Map<number, PrevWeekState>();
  for (const a of prevWeekAssignments) {
    if (a.shift_type !== 'day' && a.shift_type !== 'mid') continue;
    const dow = dayjs(a.date).isoWeekday();
    const ps = prevState.get(a.employee_id) ?? { weekendShifts: 0, tuesdayShifts: 0, dayShifts: 0, midShifts: 0 };
    if (dow >= 6) ps.weekendShifts++;
    if (dow === 2) ps.tuesdayShifts++;
    if (a.shift_type === 'day') ps.dayShifts++;
    if (a.shift_type === 'mid') ps.midShifts++;
    prevState.set(a.employee_id, ps);
  }

  // locked assignments grouped by date
  const lockedByDate = new Map<string, Assignment[]>();
  for (const a of lockedAssignments) {
    const arr = lockedByDate.get(a.date) ?? [];
    arr.push(a);
    lockedByDate.set(a.date, arr);

    // locked shifts count toward quota
    if (a.shift_type === 'day' || a.shift_type === 'mid') {
      const s = state.get(a.employee_id);
      if (s) {
        s.shiftsAssigned++;
        s.assignedDates.add(a.date);
        const dow = dayjs(a.date).isoWeekday();
        if (dow >= 6) s.weekendShiftsThisWeek++;
        if (dow === 2) s.tuesdayShiftsThisWeek++;
      }
    }
  }

  // ── Phase 0: Pre-assign working days for balanced weekly distribution ──
  const prevSunDate = dayjs(weekDates[0]).subtract(1, 'day').format('YYYY-MM-DD');
  const prevSatDate = dayjs(weekDates[0]).subtract(2, 'day').format('YYYY-MM-DD');

  // Employees who had mid/night on the previous Sunday — cannot take day shift on Monday
  const prevSunMidNightIds = new Set<number>(
    prevWeekAssignments
      .filter(a => a.date === prevSunDate && REST_RISK_SHIFTS_ALG.has(a.shift_type))
      .map(a => a.employee_id)
  );

  // Employees who worked both Saturday and Sunday last week — prefer weekday assignment this week
  const prevWeekendBothIds = new Set<number>(
    active
      .filter(e => {
        const satWork = prevWeekAssignments.some(
          a => a.employee_id === e.id && a.date === prevSatDate && WORK_SHIFTS_ALG.has(a.shift_type)
        );
        const sunWork = prevWeekAssignments.some(
          a => a.employee_id === e.id && a.date === prevSunDate && WORK_SHIFTS_ALG.has(a.shift_type)
        );
        return satWork && sunWork;
      })
      .map(e => e.id)
  );

  // Tail consecutive work days from last week (used to cap cross-week consecutive runs).
  // Walk backwards from prevSunDate through the 7 days of last week.
  const prevTailWorkDays = new Map<number, number>();
  if (prevWeekAssignments.length > 0) {
    const prevWeekDates = Array.from({ length: 7 }, (_, i) =>
      dayjs(weekDates[0]).subtract(7 - i, 'day').format('YYYY-MM-DD')
    ); // [Mon-1w … Sun-1w]
    for (const emp of active) {
      let tail = 0;
      for (let i = prevWeekDates.length - 1; i >= 0; i--) {
        const d = prevWeekDates[i];
        const worked = prevWeekAssignments.some(
          a => a.employee_id === emp.id && a.date === d && WORK_SHIFTS_ALG.has(a.shift_type)
        );
        if (worked) tail++;
        else break;
      }
      if (tail > 0) prevTailWorkDays.set(emp.id, tail);
    }
  }

  const preAssigned = preAssignDays(
    weekDates,
    active,
    blockMap,
    dayOffMap,
    lockedByDate,
    config,
    prevSunMidNightIds,
    prevWeekendBothIds,
    prevTailWorkDays
  );

  const result: NewAssignment[] = [];
  const warnings: AlgorithmWarning[] = [];

  // Returns true if empId had a mid/night shift on checkDate (result + locked)
  const hadRestRiskOn = (empId: number, checkDate: string): boolean =>
    [...result, ...lockedAssignments].some(
      a => a.employee_id === empId && a.date === checkDate && REST_RISK_SHIFTS_ALG.has(a.shift_type)
    );

  // Returns true if the employee is allowed to take a day shift on the given date.
  // Forbidden when: Monday and employee had mid/night last Sunday,
  // or any other day when employee had mid/night the day before.
  const canTakeDayShift = (empId: number, date: string): boolean => {
    const dow = dayjs(date).isoWeekday();
    if (dow === 1) return !prevSunMidNightIds.has(empId);
    const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
    return !hadRestRiskOn(empId, prevDate);
  };

  // ── day-by-day ──
  for (const date of weekDates) {
    const dow = dayjs(date).isoWeekday(); // 1=Mon 7=Sun
    const isWeekday = dow <= 5;
    const lockedToday = lockedByDate.get(date) ?? [];
    const lockedIds = new Set(lockedToday.map((a) => a.employee_id));
    const blocked = blockMap.get(date) ?? new Set<number>();
    const dayOff = dayOffMap.get(date) ?? new Set<number>();

    // cell position counter
    const cellPos = new Map<string, number>();
    const nextPos = (shift: ShiftType) => {
      const k = `${date}|${shift}`;
      const n = cellPos.get(k) ?? 0;
      cellPos.set(k, n + 1);
      return n;
    };
    for (const a of lockedToday) {
      const k = `${date}|${a.shift_type}`;
      cellPos.set(k, (cellPos.get(k) ?? 0) + 1);
    }

    const assignedTodayIds = new Set(lockedIds);

    // Employee is available today if:
    //   - not already assigned today
    //   - not event-blocked
    //   - not on day-off
    //   - pre-assigned to work today (or is a leader on a weekday, handled separately)
    const isAvailable = (empId: number) =>
      !assignedTodayIds.has(empId) &&
      !blocked.has(empId) &&
      !dayOff.has(empId) &&
      (preAssigned.get(empId)?.has(date) ?? false);

    const pick = (
      pool: Employee[],
      preferIds: number[],
      date: string
    ): Employee | null => {
      for (const id of preferIds) {
        const e = pool.find((x) => x.id === id);
        if (e) return e;
      }
      const sorted = [...pool].sort(
        (a, b) =>
          fairnessScore(a, date, state.get(a.id)!, prevState.get(a.id)) -
          fairnessScore(b, date, state.get(b.id)!, prevState.get(b.id))
      );
      return sorted[0] ?? null;
    };

    const doAssign = (emp: Employee, shift: ShiftType, isPlanner: 0 | 1) => {
      result.push({
        date,
        shift_type: shift,
        employee_id: emp.id,
        position: nextPos(shift),
        locked: 0,
        is_planner: isPlanner,
      });
      const s = state.get(emp.id)!;
      if (shift === 'day' || shift === 'mid') {
        s.shiftsAssigned++;
        if (dow >= 6) s.weekendShiftsThisWeek++;
        if (dow === 2) s.tuesdayShiftsThisWeek++;
      }
      s.assignedDates.add(date);
      assignedTodayIds.add(emp.id);
    };

    // ── Phase 1: mandatory leader on 白班 (weekdays only) ──
    if (isWeekday) {
      const hasLockedLeader = lockedToday.some(
        (a) => a.shift_type === 'day' && empMap.get(a.employee_id)?.is_leader === 1
      );
      if (!hasLockedLeader) {
        const pool = active.filter(
          (e) =>
            e.is_leader === 1 &&
            e.mid_shift_only === 0 &&
            !assignedTodayIds.has(e.id) &&
            !blocked.has(e.id) &&
            !dayOff.has(e.id) &&
            canTakeDayShift(e.id, date) &&
            state.get(e.id)!.shiftsAssigned < e.weekly_shifts
        );
        const picked = pick(pool, config.selectedLeaderIds, date);
        if (picked) {
          doAssign(picked, 'day', 0);
        } else {
          warnings.push({ type: 'no_leader', date, message: `${date} 无可用值班领导` });
        }
      }
    }

    // ── Phase 2: planner (初审 on 白班) ──
    {
      const hasLockedPlanner = lockedToday.some((a) => a.is_planner === 1);
      if (!hasLockedPlanner) {
        const plannersForToday = config.plannerSchedule
          .filter((ps) => ps.dates.includes(date))
          .map((ps) => ps.employeeId);
        const pool = active.filter(
          (e) =>
            e.is_first_reviewer === 1 &&
            e.is_leader === 0 &&
            e.mid_shift_only === 0 &&
            isAvailable(e.id) &&
            canTakeDayShift(e.id, date) &&
            state.get(e.id)!.shiftsAssigned < e.weekly_shifts
        );
        const picked = pick(pool, plannersForToday, date);
        if (picked) {
          doAssign(picked, 'day', 1);
        }
      }
    }

    // ── Phase 3a: 仅中班 employees ──
    {
      const pool = active
        .filter((e) => e.mid_shift_only === 1 && isAvailable(e.id))
        .sort(
          (a, b) =>
            fairnessScore(a, date, state.get(a.id)!, prevState.get(a.id)) -
            fairnessScore(b, date, state.get(b.id)!, prevState.get(b.id))
        );
      for (const emp of pool) {
        if (state.get(emp.id)!.shiftsAssigned < emp.weekly_shifts) {
          doAssign(emp, 'mid', 0);
        }
      }
    }

    // ── Phase 3b: 仅白班 employees ──
    {
      const pool = active
        .filter((e) => e.day_shift_only === 1 && e.mid_shift_only === 0 && isAvailable(e.id) && canTakeDayShift(e.id, date))
        .sort(
          (a, b) =>
            fairnessScore(a, date, state.get(a.id)!, prevState.get(a.id)) -
            fairnessScore(b, date, state.get(b.id)!, prevState.get(b.id))
        );
      for (const emp of pool) {
        if (state.get(emp.id)!.shiftsAssigned < emp.weekly_shifts) {
          doAssign(emp, 'day', 0);
        }
      }
    }

    // ── Phase 3c: general employees ──
    {
      const pool = active
        .filter(
          (e) =>
            e.mid_shift_only === 0 &&
            e.day_shift_only === 0 &&
            e.is_leader === 0 &&
            isAvailable(e.id)
        )
        .sort(
          (a, b) =>
            fairnessScore(a, date, state.get(a.id)!, prevState.get(a.id)) -
            fairnessScore(b, date, state.get(b.id)!, prevState.get(b.id))
        );

      // 白班至少 1 名编辑（非领导、非策划）
      const nonPlannerDayCount = () =>
        [...lockedToday, ...result.filter((r) => r.date === date)]
          .filter(
            (a) =>
              a.shift_type === 'day' &&
              a.is_planner === 0 &&
              empMap.get(a.employee_id)?.is_leader !== 1
          )
          .length;

      for (const emp of pool) {
        const s = state.get(emp.id)!;
        if (s.shiftsAssigned >= emp.weekly_shifts) continue;

        const dayCount = [...lockedToday, ...result.filter((r) => r.date === date)].filter(
          (a) => a.shift_type === 'day'
        ).length;
        const midCount = [...lockedToday, ...result.filter((r) => r.date === date)].filter(
          (a) => a.shift_type === 'mid'
        ).length;
        const total = dayCount + midCount;
        const dayRatio = total === 0 ? 0 : dayCount / total;

        const needsEditor = nonPlannerDayCount() < 1;
        const canDay = canTakeDayShift(emp.id, date);

        // Cross-week shift alternation for general employees:
        // if last week had more day shifts → prefer mid this week, and vice versa.
        const prev = prevState.get(emp.id);
        const prevDominance = prev && (prev.dayShifts !== prev.midShifts)
          ? (prev.dayShifts > prev.midShifts ? 'day' : 'mid')
          : null;

        const shift: ShiftType = (() => {
          if (!canDay) return 'mid';
          if (needsEditor) return 'day';
          if (prevDominance === 'day') return 'mid';      // last week mostly day → mid this week
          if (prevDominance === 'mid') return dayRatio < 0.65 ? 'day' : 'mid'; // last week mostly mid → prefer day
          return dayRatio < 0.6 ? 'day' : 'mid';         // no history → balance by ratio
        })();
        doAssign(emp, shift, 0);
      }
    }
  }

  // ── Phase 5: one 专题采制 per active non-leader employee per week (weekdays only) ──
  for (const emp of active) {
    // Leaders do not participate in 专题采制
    if (emp.is_leader === 1) continue;

    const shiftDates = new Set([
      ...result
        .filter((a) => a.employee_id === emp.id && (a.shift_type === 'day' || a.shift_type === 'mid'))
        .map((a) => a.date),
      ...lockedAssignments
        .filter((a) => a.employee_id === emp.id && (a.shift_type === 'day' || a.shift_type === 'mid'))
        .map((a) => a.date),
    ]);

    // Candidates: weekdays only, not on shift, not event-blocked, not day-off
    const weekdayCandidates = weekDates.filter(
      (d) =>
        dayjs(d).isoWeekday() <= 5 &&
        !shiftDates.has(d) &&
        !(blockMap.get(d) ?? new Set()).has(emp.id) &&
        !(dayOffMap.get(d) ?? new Set()).has(emp.id)
    );
    if (weekdayCandidates.length === 0) continue;

    const topicCountOf = (d: string) =>
      result.filter((a) => a.date === d && a.shift_type === 'topic').length;
    const pickedDay = weekdayCandidates
      .slice()
      .sort((a, b) => topicCountOf(a) - topicCountOf(b))[0];

    result.push({
      date: pickedDay,
      shift_type: 'topic',
      employee_id: emp.id,
      position: topicCountOf(pickedDay),
      locked: 0,
      is_planner: 0,
    });
  }

  // ── special night shifts from config ──
  for (const sr of config.specialShifts) {
    const cellPos = new Map<string, number>();
    for (const empId of sr.employeeIds) {
      const k = `${sr.date}|night`;
      const pos = cellPos.get(k) ?? 0;
      cellPos.set(k, pos + 1);
      result.push({
        date: sr.date,
        shift_type: 'night',
        employee_id: empId,
        position: pos,
        locked: 0,
        is_planner: 0,
      });
    }
  }

  // ── post-processing warnings ──

  // NOTE: cross-week Sunday-mid → Monday-day conflict is detected at save time
  // by riskDetection.ts (Check B). The in-week variant (same weekDates) cannot
  // realistically occur because Monday comes before Sunday in the same week.

  // 1. Consecutive days > 7
  for (const emp of active) {
    const s = state.get(emp.id)!;
    const sortedDates = [...s.assignedDates].sort();
    let maxConsec = sortedDates.length > 0 ? 1 : 0;
    let consec = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = dayjs(sortedDates[i]).diff(dayjs(sortedDates[i - 1]), 'day');
      if (diff === 1) {
        consec++;
        if (consec > maxConsec) maxConsec = consec;
      } else {
        consec = 1;
      }
    }
    if (maxConsec > 7) {
      warnings.push({
        type: 'consecutive_days',
        employeeId: emp.id,
        message: `${emp.name} 连续上班 ${maxConsec} 天，请注意`,
      });
    }
  }

  // blocked_employee: 全周 0 班且有阻断事项（优先于 quota_unmet，避免重复提示）
  const blockedEmpIds = new Set<number>();
  for (const emp of active) {
    const s = state.get(emp.id)!;
    const reasons = blockReasonMap.get(emp.id);
    if (emp.weekly_shifts > 0 && s.shiftsAssigned === 0 && reasons && reasons.length > 0) {
      blockedEmpIds.add(emp.id);
      warnings.push({
        type: 'blocked_employee',
        employeeId: emp.id,
        message: `${emp.name} 因「${reasons.join('、')}」本周无排班`,
      });
    }
  }

  // 3. Quota unmet
  for (const emp of active) {
    if (blockedEmpIds.has(emp.id)) continue;
    const s = state.get(emp.id)!;
    if (s.shiftsAssigned < emp.weekly_shifts) {
      warnings.push({
        type: 'quota_unmet',
        employeeId: emp.id,
        message: `${emp.name} 本周仅分配 ${s.shiftsAssigned}/${emp.weekly_shifts} 个班次（员工可能全周不可用）`,
      });
    }
  }

  return { assignments: result, warnings };
}
