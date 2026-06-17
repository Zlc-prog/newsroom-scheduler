export interface Department {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface DepartmentInput {
  name: string;
  description: string | null;
}
