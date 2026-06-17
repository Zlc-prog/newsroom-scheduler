import { create } from 'zustand';
import { scheduleEventService } from '../services/scheduleEventService';
import type {
  ScheduleEvent,
  ScheduleEventFilters,
  ScheduleEventInput,
} from '../types/scheduleEvent';

interface ScheduleEventState {
  items: ScheduleEvent[];
  filters: ScheduleEventFilters;
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  setFilters: (patch: Partial<ScheduleEventFilters>) => Promise<void>;
  resetFilters: () => Promise<void>;
  add: (input: ScheduleEventInput) => Promise<void>;
  update: (id: number, input: ScheduleEventInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

const DEFAULT_FILTERS: ScheduleEventFilters = { type: '', from: '', to: '' };

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export const useScheduleEventStore = create<ScheduleEventState>((set, get) => ({
  items: [],
  filters: { ...DEFAULT_FILTERS },
  loading: false,
  error: null,

  async fetchAll() {
    set({ loading: true, error: null });
    try {
      const items = await scheduleEventService.list(get().filters);
      set({ items, loading: false });
    } catch (e) {
      set({ error: toErrorMessage(e), loading: false });
      throw e;   // re-throw so callers (add/update/remove) can detect the failure
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

  async add(input) {
    try {
      await scheduleEventService.create(input);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async update(id, input) {
    try {
      await scheduleEventService.update(id, input);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async remove(id) {
    try {
      await scheduleEventService.remove(id);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },
}));
