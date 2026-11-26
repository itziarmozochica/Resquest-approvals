export interface Step {
  id: string;
  label: string;
  title?: string;
  description?: string;
  status: 'completed' | 'active' | 'started' | 'disabled' | 'inactive';
}
