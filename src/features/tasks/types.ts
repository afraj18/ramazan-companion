export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'excused' | 'not_applicable';
export type TaskTimeGroup = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export interface TaskTemplate {
  id: string;
  category: string;
  titleKey: string;
  descriptionKey?: string;
  timeGroup: TaskTimeGroup;
  frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  season: 'all_year' | 'ramadan' | 'optional';
  defaultPoints: number;
  isDefault: boolean;
}
