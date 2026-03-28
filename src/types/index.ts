export interface HabitBase {
  id: string;
  title: string;
  name: string;
  color: string;
}

export interface HabitEntry extends HabitBase {
  days: number[];
  weekNumbers: number[];
}

export interface HabitData {
  [year: string]: {
    [month: string]: HabitEntry[];
  };
}

export interface Exercise {
  userId: string;
  timestamp: Date;
  pushups: number;
  pullups: number;
  dips: number;
  lateralRaise: number;
  running: number;
  avgPace: string;
  boxStepUp: number;
  legRaise: number;
}

export interface WeeklyGoals {
  pushups: number;
  pullups: number;
  dips: number;
  lateralRaise: number;
  running: number;
  boxStepUp: number;
  legRaise: number;
}
