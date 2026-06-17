import { create } from 'zustand';
import { employeeService } from '../services/employeeService';
import type {
  Employee,
  EmployeeInput,
  EmployeePatchKey,
} from '../types/employee';

const SORT_KEY = 'emp-sort-order';

function loadSavedOrder(): number[] {
  try {
    const raw = localStorage.getItem(SORT_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function saveSortOrder(ids: number[]) {
  localStorage.setItem(SORT_KEY, JSON.stringify(ids));
}

function applyOrder(employees: Employee[], savedIds: number[]): Employee[] {
  if (savedIds.length === 0) {
    // Default: leaders first, then reviewers, then others (by id asc within group)
    return [...employees].sort((a, b) => {
      if (a.is_leader !== b.is_leader) return b.is_leader - a.is_leader;
      if (a.is_first_reviewer !== b.is_first_reviewer)
        return b.is_first_reviewer - a.is_first_reviewer;
      return a.id - b.id;
    });
  }
  const idxMap = new Map(savedIds.map((id, i) => [id, i]));
  return [...employees].sort((a, b) => {
    const ia = idxMap.get(a.id) ?? 9999;
    const ib = idxMap.get(b.id) ?? 9999;
    if (ia !== ib) return ia - ib;
    return a.id - b.id;
  });
}

interface EmployeeState {
  items: Employee[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  add: (input: EmployeeInput) => Promise<void>;
  update: (id: number, input: EmployeeInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  patch: (
    current: Employee,
    key: EmployeePatchKey,
    value: number | string
  ) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number) => void;
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async fetchAll() {
    set({ loading: true, error: null });
    try {
      const raw = await employeeService.list();
      const items = applyOrder(raw, loadSavedOrder());
      set({ items, loading: false });
    } catch (e) {
      set({ error: toErrorMessage(e), loading: false });
    }
  },

  async add(input) {
    try {
      await employeeService.create(input);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async update(id, input) {
    try {
      await employeeService.update(id, input);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async remove(id) {
    try {
      await employeeService.remove(id);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  async patch(current, key, value) {
    try {
      await employeeService.patch(current, key, value);
      await get().fetchAll();
    } catch (e) {
      set({ error: toErrorMessage(e) });
      throw e;
    }
  },

  reorder(fromIndex, toIndex) {
    const items = [...get().items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    saveSortOrder(items.map((e) => e.id));
    set({ items });
  },
}));
