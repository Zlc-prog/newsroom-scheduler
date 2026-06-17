import { create } from 'zustand';
import { historyService } from '../services/historyService';
import type {
  AssignmentRow,
  MeetingRow,
  Schedule,
  ScheduleSummary,
} from '../types/schedule';

interface HistoryFilters {
  from: string;
  to: string;
}

interface HistoryDetail {
  schedule: Schedule & { updated_at: string };
  assignments: AssignmentRow[];
  meetings: MeetingRow[];
}

interface HistoryState {
  items: ScheduleSummary[];
  filters: HistoryFilters;
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  detail: HistoryDetail | null;
  detailLoading: boolean;

  fetchAll: () => Promise<void>;
  setFilters: (patch: Partial<HistoryFilters>) => Promise<void>;
  resetFilters: () => Promise<void>;
  select: (id: number | null) => Promise<void>;
  remove: (id: number) => Promise<void>;
  copyTo: (source_id: number, target_week_start: string) => Promise<{
    target_week_start: string;
    overwritten: boolean;
  }>;
}

const DEFAULT_FILTERS: HistoryFilters = { from: '', to: '' };

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  filters: { ...DEFAULT_FILTERS },
  loading: false,
  error: null,
  selectedId: null,
  detail: null,
  detailLoading: false,

  async fetchAll() {
    set({ loading: true, error: null });
    try {
      const items = await historyService.list(get().filters);
      set({ loading: false, items });
      const sel = get().selectedId;
      if (sel != null && !items.some((i) => i.id === sel)) {
        set({ selectedId: null, detail: null });
      }
    } catch (e) {
      set({ loading: false, error: toErrorMessage(e) });
    }
  },

  async setFilters(patch) {
    set({ filters: { ...get().filters, ...patch } });
    await get().fetchAll();
  },

  async resetFilters() {
    set({ filters: { ...DEFAULT_FILTERS } });
    await get().fetchAll();
  },

  async select(id) {
    if (id == null) {
      set({ selectedId: null, detail: null });
      return;
    }
    set({ selectedId: id, detailLoading: true, detail: null });
    try {
      const detail = await historyService.loadFull(id);
      set({ detail, detailLoading: false });
    } catch (e) {
      set({ detailLoading: false, error: toErrorMessage(e) });
    }
  },

  async remove(id) {
    try {
      await historyService.remove(id);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async copyTo(source_id, target_week_start) {
    try {
      const res = await historyService.copyTo(source_id, target_week_start);
      await get().fetchAll();
      return {
        target_week_start: res.schedule.week_start,
        overwritten: res.overwritten,
      };
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },
}));
