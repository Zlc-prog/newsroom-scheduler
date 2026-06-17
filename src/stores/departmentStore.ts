import { create } from 'zustand';
import { departmentService } from '../services/departmentService';
import type { Department, DepartmentInput } from '../types/department';

interface DepartmentState {
  items: Department[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  add: (input: DepartmentInput) => Promise<void>;
  update: (id: number, input: DepartmentInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  countEmployees: (id: number) => Promise<number>;
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async fetchAll() {
    set({ loading: true, error: null });
    try {
      const items = await departmentService.list();
      set({ items, loading: false });
    } catch (e) {
      set({ error: toErrorMessage(e), loading: false });
    }
  },

  async add(input) {
    try {
      await departmentService.create(input);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async update(id, input) {
    try {
      await departmentService.update(id, input);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async remove(id) {
    try {
      await departmentService.remove(id);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  countEmployees(id) {
    return departmentService.countEmployees(id);
  },
}));
