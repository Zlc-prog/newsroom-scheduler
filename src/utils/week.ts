import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export function toIsoDate(d: dayjs.Dayjs | Date | string): string {
  return dayjs(d).format('YYYY-MM-DD');
}

export function getWeekStart(d: dayjs.Dayjs | Date | string = new Date()): string {
  return toIsoDate(dayjs(d).startOf('isoWeek'));
}

export function getWeekDates(weekStart: string): string[] {
  const base = dayjs(weekStart);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(base.add(i, 'day')));
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  return toIsoDate(dayjs(weekStart).add(deltaWeeks, 'week'));
}

export function formatRange(weekStart: string): string {
  const start = dayjs(weekStart);
  const end = start.add(6, 'day');
  return `${start.format('YYYY/MM/DD')} – ${end.format('MM/DD')}`;
}

export function weekdayLabel(date: string): string {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][
    dayjs(date).isoWeekday() - 1
  ];
}
