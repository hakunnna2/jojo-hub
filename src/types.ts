export interface StudySession {
  id: string;
  subjectId: string;
  duration: number; // in minutes
  timestamp: number;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  notes?: string;
}

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';
