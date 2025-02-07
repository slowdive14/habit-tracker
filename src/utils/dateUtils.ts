export interface WeekInfo {
  weekNumber: number;
  year: number;
}

export function getWeekInfo(date: Date): WeekInfo {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  
  return {
    weekNumber,
    year: date.getFullYear()
  };
} 