import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { getDb } from '../db/client';
import type { Assignment } from '../types/schedule';
import type { Employee } from '../types/employee';
import type { AlgorithmWarning } from '../types/algorithm';

dayjs.extend(isoWeek);

const REST_RISK_SHIFTS = new Set(['mid', 'night', 'night_small', 'night_mid']);
const WORK_SHIFTS = new Set(['day', 'mid', 'night', 'night_small', 'night_mid']);

interface RawAssignment {
  date: string;
  shift_type: string;
  employee_id: number;
}

async function loadPrevWeekAssignments(prevWeekStart: string): Promise<RawAssignment[]> {
  const db = await getDb();
  const schedules = await db.select<Array<{ id: number }>>(
    'SELECT id FROM schedules WHERE week_start = $1',
    [prevWeekStart]
  );
  if (schedules.length === 0) return [];
  return db.select<RawAssignment[]>(
    'SELECT date, shift_type, employee_id FROM schedule_assignments WHERE schedule_id = $1',
    [schedules[0].id]
  );
}

export async function detectSaveRisks(
  weekStart: string,
  currentAssignments: Assignment[],
  employees: Employee[]
): Promise<AlgorithmWarning[]> {
  const warnings: AlgorithmWarning[] = [];
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const prevWeekStart = dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD');
  const prevAssignments = await loadPrevWeekAssignments(prevWeekStart);

  const prevSunDate = dayjs(weekStart).subtract(1, 'day').format('YYYY-MM-DD');
  const prevSatDate = dayjs(weekStart).subtract(2, 'day').format('YYYY-MM-DD');
  const currSatDate = dayjs(weekStart).add(5, 'day').format('YYYY-MM-DD');
  const currSunDate = dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD');
  const thisMonDate = weekStart;

  // ── Check A: 跨周连续上班 >5 天 ────────────────────────────────────────────
  // 取上周六、日 + 本周全部 7 天的 day/mid 班次，计算最长连续段
  const crossWeekDates = new Set([prevSatDate, prevSunDate]);
  const thisWeekDates = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    dayjs(weekStart).add(i, 'day').format('YYYY-MM-DD')
  );
  thisWeekDates.forEach((d) => crossWeekDates.add(d));

  const prevWorkMap = new Map<number, Set<string>>();
  for (const a of prevAssignments) {
    if (!WORK_SHIFTS.has(a.shift_type)) continue;
    if (!crossWeekDates.has(a.date)) continue;
    if (!prevWorkMap.has(a.employee_id)) prevWorkMap.set(a.employee_id, new Set());
    prevWorkMap.get(a.employee_id)!.add(a.date);
  }

  const currWorkMap = new Map<number, Set<string>>();
  for (const a of currentAssignments) {
    if (!WORK_SHIFTS.has(a.shift_type)) continue;
    if (!currWorkMap.has(a.employee_id)) currWorkMap.set(a.employee_id, new Set());
    currWorkMap.get(a.employee_id)!.add(a.date);
  }

  for (const emp of employees) {
    const dates = new Set([
      ...(prevWorkMap.get(emp.id) ?? []),
      ...(currWorkMap.get(emp.id) ?? []),
    ]);
    const sorted = [...dates].sort();
    if (sorted.length === 0) continue;
    let maxConsec = 1;
    let consec = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = dayjs(sorted[i]).diff(dayjs(sorted[i - 1]), 'day');
      if (diff === 1) {
        consec++;
        if (consec > maxConsec) maxConsec = consec;
      } else {
        consec = 1;
      }
    }
    if (maxConsec > 5) {
      warnings.push({
        type: 'cross_week_consecutive',
        employeeId: emp.id,
        message: `${emp.name} 跨周连续上班 ${maxConsec} 天，建议关注`,
      });
    }
  }

  // ── Check B: 上周日中班/夜班 → 本周一白班 ──────────────────────────────────
  if (prevAssignments.length > 0) {
    const prevSunRestRisk = prevAssignments.filter(
      (a) => a.date === prevSunDate && REST_RISK_SHIFTS.has(a.shift_type)
    );
    const thisMonDay = currentAssignments.filter(
      (a) => a.date === thisMonDate && a.shift_type === 'day'
    );
    for (const pa of prevSunRestRisk) {
      if (thisMonDay.some((a) => a.employee_id === pa.employee_id)) {
        const emp = empMap.get(pa.employee_id);
        const shiftLabel = pa.shift_type === 'mid' ? '中班' : '夜班';
        warnings.push({
          type: 'cross_week_sun_night_mon_day',
          date: thisMonDate,
          employeeId: pa.employee_id,
          message: `${emp?.name ?? `员工${pa.employee_id}`} 上周日${shiftLabel}→本周一白班，注意休息`,
        });
      }
    }
  }

  // ── Check C: 连续两个周末均上满两天 ────────────────────────────────────────
  if (prevAssignments.length > 0) {
    for (const emp of employees) {
      const workedPrevSat = prevAssignments.some(
        (a) => a.employee_id === emp.id && a.date === prevSatDate && WORK_SHIFTS.has(a.shift_type)
      );
      const workedPrevSun = prevAssignments.some(
        (a) => a.employee_id === emp.id && a.date === prevSunDate && WORK_SHIFTS.has(a.shift_type)
      );
      const workedCurrSat = currentAssignments.some(
        (a) => a.employee_id === emp.id && a.date === currSatDate && WORK_SHIFTS.has(a.shift_type)
      );
      const workedCurrSun = currentAssignments.some(
        (a) => a.employee_id === emp.id && a.date === currSunDate && WORK_SHIFTS.has(a.shift_type)
      );
      if (workedPrevSat && workedPrevSun && workedCurrSat && workedCurrSun) {
        warnings.push({
          type: 'consecutive_weekends',
          employeeId: emp.id,
          message: `${emp.name} 连续两个周末均上两天班，建议安排轮休`,
        });
      }
    }
  }

  // ── Check D: 当周中班/夜班 → 次日白班（休息不足） ──────────────────────────
  const empDayShiftDates = new Map<number, Set<string>>();
  const empRestRiskDates = new Map<number, Set<string>>();
  for (const a of currentAssignments) {
    if (a.shift_type === 'day') {
      if (!empDayShiftDates.has(a.employee_id)) empDayShiftDates.set(a.employee_id, new Set());
      empDayShiftDates.get(a.employee_id)!.add(a.date);
    }
    if (REST_RISK_SHIFTS.has(a.shift_type)) {
      if (!empRestRiskDates.has(a.employee_id)) empRestRiskDates.set(a.employee_id, new Set());
      empRestRiskDates.get(a.employee_id)!.add(a.date);
    }
  }

  const WEEKDAY_LABELS: Record<number, string> = {
    1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日',
  };

  for (const emp of employees) {
    const riskDates = empRestRiskDates.get(emp.id);
    const dayDates = empDayShiftDates.get(emp.id);
    if (!riskDates || !dayDates) continue;
    for (const d of riskDates) {
      const nextDay = dayjs(d).add(1, 'day').format('YYYY-MM-DD');
      if (dayDates.has(nextDay)) {
        const shiftType = currentAssignments.find(
          (a) => a.employee_id === emp.id && a.date === d && REST_RISK_SHIFTS.has(a.shift_type)
        )?.shift_type;
        const shiftLabel = shiftType === 'mid' ? '中班' : '夜班';
        const dLabel = WEEKDAY_LABELS[dayjs(d).isoWeekday()] ?? d;
        const nextLabel = WEEKDAY_LABELS[dayjs(nextDay).isoWeekday()] ?? nextDay;
        warnings.push({
          type: 'intra_week_rest_risk',
          date: d,
          employeeId: emp.id,
          message: `${emp.name} ${dLabel}${shiftLabel}→${nextLabel}白班，休息时间不足`,
        });
      }
    }
  }

  // ── Check E: 同一员工同一天被排多个班次 ───────────────────────────────────────
  const SHIFT_LABEL_MAP: Record<string, string> = {
    day: '白班', mid: '中班',
    night: '大夜', night_small: '小夜', night_mid: '中夜',
  };
  // Group work shifts (excluding topic/meeting) by employee+date
  const empDateShifts = new Map<string, string[]>();
  for (const a of currentAssignments) {
    if (!(a.shift_type in SHIFT_LABEL_MAP)) continue;
    const key = `${a.employee_id}|${a.date}`;
    const arr = empDateShifts.get(key) ?? [];
    arr.push(a.shift_type);
    empDateShifts.set(key, arr);
  }
  for (const [key, shifts] of empDateShifts) {
    if (shifts.length < 2) continue;
    const [empIdStr, date] = key.split('|');
    const emp = empMap.get(Number(empIdStr));
    const dow = dayjs(date).isoWeekday();
    const dayLabel = WEEKDAY_LABELS[dow] ?? date;
    const shiftLabels = shifts.map((s) => SHIFT_LABEL_MAP[s] ?? s).join('、');
    warnings.push({
      type: 'duplicate_shift',
      date,
      employeeId: Number(empIdStr),
      message: `${emp?.name ?? `员工${empIdStr}`} ${dayLabel}被排了多个班次（${shiftLabels}），请检查`,
    });
  }

  return warnings;
}
