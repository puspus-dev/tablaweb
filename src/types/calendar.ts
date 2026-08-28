/** Naptár események egységes modellje */

export type CalendarEventType =
  | 'lesson'
  | 'public_holiday'
  | 'school_break'
  | 'transferred_rest'
  | 'working_saturday';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: CalendarEventType;
  /** Óra esetén */
  subject?: string;
  teacher?: string;
  room?: string;
  period?: number;
  group?: string;
  theme?: string;
  hasHomework?: boolean;
  hasExam?: boolean;
  /** Szünet / ünnep esetén */
  allDay?: boolean;
  source?: 'kreta' | 'nager' | 'openholidays' | 'fallback';
}

export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed?: boolean;
  global?: boolean;
  types?: string[];
}

export interface OpenHoliday {
  id?: string;
  startDate: string;
  endDate: string;
  type?: string;
  name?: Array<{ language: string; text: string }>;
  nationwide?: boolean;
}
