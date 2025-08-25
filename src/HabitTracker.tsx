import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Stack,
  Tooltip,
  IconButton
} from '@mui/material';
import { User } from 'firebase/auth';
import { HeatMapGrid } from 'react-grid-heatmap';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WeeklyTrend from './components/WeeklyTrend';
import HabitStats from './components/HabitStats';
import './styles/HabitTracker.css';

// Types
interface HabitBase {
  id: string;
  title: string;
  name: string;
  color: string;
}

interface HabitData {
  [year: string]: {
    [month: string]: Array<HabitBase & { days: number[]; weekNumbers: number[] }>;
  };
}

interface HabitTrackerProps {
  user: User | null;
  saveHabitData: (data: HabitData) => Promise<void>;
  loadHabitData: () => Promise<HabitData | null>;
}

// 기본 설정
const HABITS: HabitBase[] = [
  { id: 'exercise', name: 'Exercise', color: '#0072B2', title: '운동' },
  { id: 'english-reading', name: 'English Reading', color: '#E69F00', title: '원서 읽기' },
  { id: 'reading', name: 'Reading', color: '#009E73', title: '독서' },
  { id: 'english-kids', name: 'English with kids', color: '#D55E00', title: '아이들과 영어' },
  { id: 'massage', name: 'Wife Massage', color: '#CC79A7', title: '아내 마사지' },
  { id: 'back-pain', name: 'Back Pain', color: '#882255', title: '등 결림' },
  { id: 'esophagitis', name: 'Esophagitis', color: '#661188', title: '식도염' },
];

// 습관 분류
const PRIMARY_HABITS = ['exercise', 'english-reading', 'reading'];
const SECONDARY_HABITS = ['english-kids', 'massage'];
const HEALTH_STATUS_HABITS = ['back-pain', 'esophagitis'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_KR = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
];

// 한국 시간 유틸리티 함수
const getKoreanDate = (date: Date = new Date()): Date => {
  const koreanDate = new Date(date);
  // UTC+9 시간을 더하지 않고, 날짜만 그대로 사용
  return koreanDate;
};

// 주차 정보 계산 함수
const getWeekInfo = (date: Date): { weekNumber: number; weekStart: Date; weekEnd: Date } => {
  const koreanDate = getKoreanDate(date);
  const year = koreanDate.getFullYear();
  const month = koreanDate.getMonth();
  const day = koreanDate.getDate();
  
  // 해당 주의 시작일(월요일)과 종료일(일요일) 계산
  const weekStart = new Date(koreanDate);
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 월요일이 0이 되도록 조정
  weekStart.setDate(weekStart.getDate() - diff); // 월요일로 조정
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // 일요일
  weekEnd.setHours(23, 59, 59, 999);
  
  // 주차 계산
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayWeekDay = firstDayOfMonth.getDay();
  const adjustedFirstDayWeekDay = firstDayWeekDay === 0 ? 7 : firstDayWeekDay; // 일요일을 7로 조정
  
  // 첫 주에 있는 1일의 요일에 따라 주차 계산
  const daysPassed = day - 1;
  const weekNumber = Math.ceil((daysPassed + adjustedFirstDayWeekDay - 1) / 7);
  
  return {
    weekNumber,
    weekStart,
    weekEnd
  };
};

// 데이터 변환 유틸리티 함수
const transformDataForComponents = (rawData: HabitData | null): HabitData => {
  console.log('변환 전 원본 데이터:', rawData);
  const result: HabitData = {};
  
  if (!rawData) {
    // 빈 데이터일 경우 2025년 2월부터의 기본 구조만 생성
    result['2025'] = {};
      MONTHS.forEach(month => {
      if (MONTHS.indexOf(month) >= MONTHS.indexOf('February')) {
        result['2025'][month] = HABITS.map(habit => ({
          ...habit,
          days: Array(31).fill(0),
          weekNumbers: Array(31).fill(0).map((_, index) => 
            getWeekInfo(new Date(2025, MONTHS.indexOf(month), index + 1)).weekNumber
          )
        }));
      }
    });
  } else {
    // 모든 연도의 데이터 처리
    Object.keys(rawData).forEach(year => {
      result[year] = {};
      
      // 각 월에 대해
      MONTHS.forEach(month => {
        // 2025년 2월 이전의 데이터는 무시
        if (year === '2025' && MONTHS.indexOf(month) < MONTHS.indexOf('February')) {
          return;
        }

        // 1. 연도 내부의 월 데이터 확인
        let monthData = rawData[year]?.[month];
        
        // 2. 데이터가 없거나 잘못된 형식이면 새로 생성
        if (!monthData || !Array.isArray(monthData)) {
          monthData = HABITS.map(habit => ({
            ...habit,
            days: Array(31).fill(0),
            weekNumbers: Array(31).fill(0).map((_, index) => 
              getWeekInfo(new Date(Number(year), MONTHS.indexOf(month), index + 1)).weekNumber
            )
          }));
        }
        
        // 3. 데이터 구조 확인 및 수정
        result[year][month] = HABITS.map((habit, index) => {
          // 기존 데이터에서 해당 습관 찾기
          const existingData = monthData.find((h: any) => h.id === habit.id) || monthData[index];
          
          // 데이터 구조 검증
          const isValidData = existingData && 
                            Array.isArray(existingData.days) && 
                            existingData.days.length === 31;
          
          return {
            ...habit,
            days: isValidData ? existingData.days : Array(31).fill(0),
            weekNumbers: Array(31).fill(0).map((_, idx) => 
              getWeekInfo(new Date(Number(year), MONTHS.indexOf(month), idx + 1)).weekNumber
            )
          };
      });
    });
    });
  }

  console.log('변환 후 데이터:', result);
  return result;
};

const HabitTracker: React.FC<HabitTrackerProps> = ({ user, saveHabitData, loadHabitData }): React.ReactElement => {
  const [transformedData, setTransformedData] = useState<HabitData>(() => {
    // 초기 상태를 빈 데이터로 설정 (한국 시간 기준)
    const koreanNow = getKoreanDate();
    const currentYear = koreanNow.getFullYear().toString();
    const currentMonth = MONTHS[koreanNow.getMonth()];
    return {
      [currentYear]: {
        [currentMonth]: HABITS.map(habit => ({
          ...habit,
          days: Array(31).fill(0),
          weekNumbers: Array(31).fill(0).map((_, index) => 
            getWeekInfo(new Date(Number(currentYear), koreanNow.getMonth(), index + 1)).weekNumber
          )
        }))
      }
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedHabit, setSelectedHabit] = useState<string>('All');
  const [activeHabit, setActiveHabit] = useState<HabitBase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSecondaryHabits, setShowSecondaryHabits] = useState(false);
  const [showHealthStatus, setShowHealthStatus] = useState(false);

  // 현재 날짜 정보
  const today = new Date();
  today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
  const currentYear = today.getFullYear();

  // 데이터 로드
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const rawData = await loadHabitData();
        console.log('로드된 원본 데이터 전체:', rawData);
        console.log('원본 2025년 1월 데이터:', rawData?.['2025']?.['January']);
        
        if (rawData) {
          const transformed = transformDataForComponents(rawData);
          console.log('변환된 데이터 전체:', transformed);
          console.log('변환된 2025년 1월 데이터:', transformed['2025']?.['January']);
          
          // 데이터 유효성 검사
          if (transformed['2025']?.['January']) {
            console.log('1월 데이터 유효성 검사:');
            transformed['2025']['January'].forEach((habit, index) => {
              console.log(`${habit.title}:`, {
                daysLength: habit.days.length,
                hasNonZeroValues: habit.days.some(score => score > 0),
                weekNumbersLength: habit.weekNumbers.length
              });
            });
          }
          
          setTransformedData(transformed);
        }
        setIsInitialized(true);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!isInitialized) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [loadHabitData, isInitialized]);

  // 데이터 변경 시 저장
  useEffect(() => {
    const saveData = async () => {
      if (!isInitialized) return;
      
      try {
        console.log('저장하려는 데이터:', transformedData);
        console.log('2025년 1월 데이터 (저장 시):', transformedData['2025']?.['January']);
        await saveHabitData(transformedData);
      } catch (err) {
        console.error('Error saving data:', err);
      }
    };

    saveData();
  }, [transformedData, saveHabitData, isInitialized]);

  // 점수 업데이트 핸들러
  const handleScoreUpdate = async (habitIndex: number, score: number) => {
    const currentYear = selectedDate.getFullYear().toString();
    const month = MONTHS[selectedDate.getMonth()];
    const day = selectedDate.getDate() - 1;

    console.log('점수 업데이트 시도:', {
      year: currentYear,
      month,
      habitIndex,
      score,
      day
    });

    // 해당 연도와 월의 데이터가 없으면 생성
    let newData: HabitData = { ...transformedData };
    if (!newData[currentYear]) {
      console.log(`${currentYear}년 데이터 없음, 새로 생성`);
      newData[currentYear] = {};
    }
    if (!newData[currentYear][month]) {
      console.log(`${currentYear}년 ${month} 데이터 없음, 새로 생성`);
      newData[currentYear][month] = HABITS.map(habit => ({
        ...habit,
        days: Array(31).fill(0),
        weekNumbers: Array(31).fill(0).map((_, index) => 
          getWeekInfo(new Date(Number(currentYear), selectedDate.getMonth(), index + 1)).weekNumber
        )
      }));
    }

    // 점수 업데이트
    const updatedMonth = [...newData[currentYear][month]];
    if (!updatedMonth[habitIndex]) {
      console.log(`습관 인덱스 ${habitIndex} 데이터 없음, 새로 생성`);
      updatedMonth[habitIndex] = {
        ...HABITS[habitIndex],
        days: Array(31).fill(0),
        weekNumbers: Array(31).fill(0).map((_, index) => 
          getWeekInfo(new Date(Number(currentYear), selectedDate.getMonth(), index + 1)).weekNumber
        )
      };
    }
    updatedMonth[habitIndex] = {
      ...updatedMonth[habitIndex],
      days: [...updatedMonth[habitIndex].days.slice(0, day), score, ...updatedMonth[habitIndex].days.slice(day + 1)]
    };

    newData = {
      ...newData,
      [currentYear]: {
        ...newData[currentYear],
        [month]: updatedMonth
      }
    };

    console.log('업데이트된 데이터:', newData);
    console.log('업데이트된 2025년 1월 데이터:', newData['2025']?.['January']);

    setTransformedData(newData);
    await saveHabitData(newData);
  };

  // 지난 5주 데이터 계산
  const calculateLast8WeeksData = (habitIndex: number): { name: string; value: number }[] => {
    try {
      const today = new Date();
      today.setHours(today.getHours() + 9); // 한국 시간으로 조정
      
      // 8주 전의 월요일을 시작일로 설정
      const startDate = new Date(today);
      const daysSinceMonday = (today.getDay() + 6) % 7; // 월요일부터 몇 일이 지났는지 계산
      startDate.setDate(today.getDate() - daysSinceMonday - (7 * 7)); // 8주 전 월요일
      startDate.setHours(0, 0, 0, 0);

      const weeklyData = new Map<number, {
        weekNumber: number;
        startDate: Date;
        endDate: Date;
        totalScore: number;
        daysWithData: number;
      }>();

      let currentDate = new Date(startDate);
      while (currentDate <= today) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // 해당 주의 월요일
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // 해당 주의 일요일
        
        const weekKey = weekStart.getTime(); // 주를 구분하기 위한 고유 키
        
        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            weekNumber: weeklyData.size + 1,
            startDate: weekStart,
            endDate: weekEnd,
            totalScore: 0,
            daysWithData: 0
          });
        }
        
        const year = currentDate.getFullYear().toString();
        const month = MONTHS[currentDate.getMonth()];
        const monthData = transformedData[year]?.[month];
        
        const weekData = weeklyData.get(weekKey);
        if (weekData && monthData && monthData[habitIndex]?.days) {
          const dayScore = Number(monthData[habitIndex].days[currentDate.getDate() - 1]) || 0;
          weekData.totalScore += dayScore;
          if (dayScore > 0) weekData.daysWithData++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 정확히 8주의 데이터만 반환
      return Array.from(weeklyData.values())
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .map(week => {
          const startMonth = week.startDate.getMonth() + 1;
          const endMonth = week.endDate.getMonth() + 1;
          const startDate = week.startDate.getDate();
          const endDate = week.endDate.getDate();

          const dateRange = `${startMonth}/${startDate}~${endMonth}/${endDate}`;
          return {
            name: dateRange,
            value: Math.min(21, week.totalScore)
          };
        });
    } catch (error) {
      console.error('Error calculating weekly data:', error);
      return [];
    }
  };

  // 8주 평균 점수 계산
  const calculate8WeekAverage = (habitIndex: number): number => {
    const weeklyData = calculateLast8WeeksData(habitIndex);
    if (weeklyData.length === 0) return 0;
    
    const previousWeeksData = weeklyData.slice(0, -1);
    if (previousWeeksData.length === 0) return 0;
    
    const totalScore = previousWeeksData.reduce((sum, week) => sum + week.value, 0);
    return Math.round(totalScore / previousWeeksData.length);
  };

  // 현재 주의 경과 일수 계산
  const getCurrentWeekDays = (): number => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const dayOfWeek = today.getDay();
    return dayOfWeek === 0 ? 7 : dayOfWeek; // 일요일이면 7, 아니면 1-6 반환
  };

  // 이번 주 현재까지의 점수 계산 (월요일 시작)
  const getCurrentWeekScore = (habitIndex: number): number => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const startOfWeek = new Date(today);
    
    // 월요일을 주의 시작으로 설정
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6일 전, 아니면 (요일-1)일 전이 월요일
    startOfWeek.setDate(today.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    let score = 0;
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(startOfWeek.getDate() + i);
      
      if (checkDate > today) break;
      
      const year = checkDate.getFullYear().toString();
      const month = MONTHS[checkDate.getMonth()];
      const dayOfMonth = checkDate.getDate();
      
      const monthData = transformedData[year]?.[month];
      if (monthData && monthData[habitIndex]?.days) {
        const dayScore = monthData[habitIndex].days[dayOfMonth - 1] || 0;
        score += dayScore;
      }
    }

    return score;
  };

  // 오늘의 총점 계산 함수
  const calculateTodayScore = (): number => {
    const today = getKoreanDate();
    const currentYear = today.getFullYear().toString();
    const currentMonth = MONTHS[today.getMonth()];
    const currentDay = today.getDate();
    
    let todayTotal = 0;
    const habitIndices = [0, 1, 2]; // 운동, 영어 읽기, 독서
    
    habitIndices.forEach(index => {
      const habitData = transformedData[currentYear]?.[currentMonth]?.[index];
    if (habitData?.days) {
        const score = habitData.days[currentDay - 1] || 0;
        console.log(`${habitData.title} 오늘(${currentYear}-${currentMonth}-${currentDay}) 점수:`, score);
        todayTotal += score;
      }
    });
    
    console.log('오늘의 총점:', todayTotal);
    return todayTotal;
  };

  // 이전 달의 총점 계산 함수 (목표 점수)
  const getPreviousMonthTotal = (habitIndex: number): number => {
    const today = getKoreanDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // 현재 월의 마지막 날짜 구하기 (해당 월의 총 일수)
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // 목표 점수 = 해당 월의 일수 × 3
    const targetScore = lastDay * 3;
    console.log(`${HABITS[habitIndex].title} 이번 달 목표 점수:`, targetScore);
    
    return targetScore;
  };

  // 월간 목표 진행률 계산 함수 (현재 점수/이전 달 총점)
  const calculateMonthProgress = (habitIndices: number[]): { current: number; target: number } => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const currentYear = today.getFullYear().toString();
    const currentMonth = MONTHS[today.getMonth()];
    const currentDay = today.getDate();
    
    let currentScore = 0;
    let targetScore = 0;
    
    const habitIndex = habitIndices[0];
    const habitData = transformedData[currentYear]?.[currentMonth]?.[habitIndex];
    
    if (habitData?.days) {
      for (let day = 0; day < currentDay; day++) {
        currentScore += habitData.days[day] || 0;
      }
      
      targetScore = getPreviousMonthTotal(habitIndex);
    }
    
    return {
      current: currentScore,
      target: targetScore
    };
  };

  // 특정 날짜의 습관 점수를 가져오는 함수
  const getHabitScoreForDate = (habitIndex: number, date: Date): number => {
    const year = date.getFullYear().toString();
    const monthName = MONTHS[date.getMonth()];
    const day = date.getDate();
    const habitData = transformedData[year]?.[monthName]?.[habitIndex];
    return habitData?.days?.[day - 1] || 0;
  };

  // 연속 달성일 계산 함수 (개선된 관대한 버전)
  const calculateStreak = (habitIndex: number): number => {
    const today = getKoreanDate();
    today.setHours(0, 0, 0, 0);  // 시간 부분을 0으로 설정
    
    console.log('=== 연속 달성일 계산 시작 ===');
    console.log('습관:', HABITS[habitIndex].title);
    console.log('시작 날짜:', today.toISOString());
    
    let streak = 0;
    let allowedSkips = 2; // 연속 기록 중 최대 2일까지 건너뛸 수 있음
    let skipsUsed = 0;
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() - 1);  // 어제부터 시작
    
    // 2025년 2월 1일 이전의 날짜는 계산하지 않음
    const startDate = new Date(2025, 1, 1); // 2025년 2월 1일
    startDate.setHours(0, 0, 0, 0);
    
    console.log('기준 시작일:', startDate.toISOString());
    console.log('계산 시작 날짜:', currentDate.toISOString());
    
    if (currentDate < startDate) {
      console.log('현재 날짜가 기준 시작일보다 이전입니다.');
      return 0;
    }

    // 어제부터 이전 날짜들 확인
    while (currentDate >= startDate) {
      const year = currentDate.getFullYear().toString();
      const month = MONTHS[currentDate.getMonth()];
      const day = currentDate.getDate();

      console.log('확인 중인 날짜:', {
        date: currentDate.toISOString(),
        year,
        month,
        day
      });

      const monthData = transformedData[year]?.[month];
      const score = monthData?.[habitIndex]?.days?.[day - 1];
      
      console.log('해당 일자 점수:', score);
      
      // 점수가 없거나 0 이하일 때
      if (typeof score !== 'number' || score <= 0) {
        if (skipsUsed < allowedSkips) {
          // 아직 건너뛸 기회가 남아있으면 건너뜀
          skipsUsed++;
          console.log(`연속 기록 유지 - 건너뛰기 사용 (${skipsUsed}/${allowedSkips})`);
        } else {
          // 건너뛸 기회를 모두 사용했으면 중단
          console.log('연속 기록 중단 - 건너뛰기 기회 모두 사용');
          break;
        }
      } else {
        // 점수가 있으면 건너뛰기 카운터 리셋
        if (skipsUsed > 0) {
          console.log('점수 획득으로 건너뛰기 카운터 리셋');
          skipsUsed = 0;
        }
      }
      
      streak++;
      console.log('현재까지 연속 일수:', streak);
      
      // 이전 날짜로 이동
      currentDate.setDate(currentDate.getDate() - 1);
      
      // 안전장치: 1년 이상의 연속은 방지
      if (streak > 365) {
        console.log('최대 연속 일수(365일) 도달');
        break;
      }
    }
    
    // 오늘의 점수 확인
    const todayYear = today.getFullYear().toString();
    const todayMonth = MONTHS[today.getMonth()];
    const todayDay = today.getDate();
    const todayScore = transformedData[todayYear]?.[todayMonth]?.[habitIndex]?.days?.[todayDay - 1];
    
    if (typeof todayScore === 'number' && todayScore > 0) {
      console.log('오늘의 점수가 있어 연속 기록에 추가:', todayScore);
      streak++;
    } else if (streak > 0) {
      // 오늘 점수가 없어도 연속 기록이 있으면 건너뛰기로 처리
      console.log('오늘 점수 없음 - 연속 기록 유지 중');
      streak++;
    }
    
    console.log('=== 최종 연속 달성일:', streak, '===');
    return streak;
  };

  // 최고 연속 달성일 계산 함수 (개선된 관대한 버전)
  const calculateBestStreak = (habitIndex: number): number => {
    const today = getKoreanDate();
    today.setHours(0, 0, 0, 0);
    
    let bestStreak = 0;
    let currentStreak = 0;
    let skipsUsed = 0;
    let allowedSkips = 2; // 연속 기록 중 최대 2일까지 건너뛸 수 있음
    let currentDate = new Date(today);
    
    // 2025년 2월 1일부터 오늘까지의 모든 데이터 확인
    const startDate = new Date(2025, 1, 1);
    startDate.setHours(0, 0, 0, 0);
    
    while (currentDate >= startDate) {
      const year = currentDate.getFullYear().toString();
      const month = MONTHS[currentDate.getMonth()];
      const day = currentDate.getDate();
      
      const monthData = transformedData[year]?.[month];
      const score = monthData?.[habitIndex]?.days?.[day - 1];
      
      if (typeof score === 'number' && score > 0) {
        // 점수가 있으면 연속 기록 증가 및 건너뛰기 카운터 리셋
        currentStreak++;
        if (skipsUsed > 0) {
          skipsUsed = 0;
        }
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        // 점수가 없을 때
        if (skipsUsed < allowedSkips && currentStreak > 0) {
          // 건너뛸 기회가 있고 현재 연속 기록이 있으면 건너뜀
          skipsUsed++;
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          // 건너뛸 기회가 없거나 연속 기록이 없으면 리셋
          currentStreak = 0;
          skipsUsed = 0;
        }
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return bestStreak;
  };

  // 트윗 텍스트 생성 함수
  const generateTweetText = (): string => {
    const today = getKoreanDate(); // 현재 날짜 사용
    
    const todayScore = calculateTodayScore();
    
    const streakData = [0, 1, 2].map(index => {
      const streak = calculateStreak(index);
      return {
        name: HABITS[index].title,
        streak: streak
      };
    })
    .filter(item => item.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 2);
    
    const monthlyProgress = [0, 1, 2].map(index => ({
      name: HABITS[index].title,
      progress: calculateMonthProgress([index])
    }));
    
    // 건강 상태 정보
    const healthStatus = HABITS
      .filter(habit => ['back-pain', 'esophagitis'].includes(habit.id))
      .map(habit => {
        const index = HABITS.findIndex(h => h.id === habit.id);
        const score = transformedData[selectedYear]?.[MONTHS[selectedMonth]]?.[index]?.days?.[selectedDate.getDate() - 1] || 0;
        return {
          name: habit.title,
          score: score
        };
      });
    
    const parts: string[] = [];
    
    parts.push(`📊 ${selectedYear}.${String(selectedMonth + 1).padStart(2, '0')}.${String(selectedDate.getDate()).padStart(2, '0')} 습관 기록\n`);
    parts.push(`✨ 오늘의 총점: ${todayScore}/9\n`);
    
    if (streakData.length > 0) {
      parts.push(`🔥 연속 달성: ${streakData.map(item => `${item.name} ${item.streak}일`).join(', ')}\n`);
    }
    
    parts.push(`\n📈 월간 진행`);
    monthlyProgress.forEach(item => {
      parts.push(`\n${item.name}: ${item.progress.current}/${item.progress.target}점`);
    });

    parts.push(`\n\n🏥 건강 상태 (0:좋음~3:나쁨)`);
    healthStatus.forEach(item => {
      parts.push(`\n${item.name}: ${item.score}점`);
    });
    
    parts.push(`\n\n💪 내일을 위한 짧은 다짐:\n`);
    parts.push(`\n#습관모니터링`);
    
    return parts.join('');
  };

  // 트윗 공유 함수
  const shareTweet = (): void => {
    const tweetText = generateTweetText();
    const encodedText = encodeURIComponent(tweetText);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    const width = 550;
    const height = 420;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      twitterUrl,
      'tweet',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0`
    );
  };

  // 주간 통계 계산
  const calculateWeeklyStats = () => {
    const weeklyData = new Map<number, {
      weekNumber: number;
      startDate: Date;
      endDate: Date;
      totalScore: number;
      daysWithData: number;
    }>();

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30); // 최근 30일

    try {
      let currentDate = new Date(startDate);
      while (currentDate <= today) {
        const { weekNumber, weekStart: startDate, weekEnd: endDate } = getWeekInfo(currentDate);
        
        if (!weeklyData.has(weekNumber)) {
          weeklyData.set(weekNumber, {
            weekNumber,
            startDate,
            endDate,
            totalScore: 0,
            daysWithData: 0
          });
        }
        
        const year = currentDate.getFullYear().toString();
        const month = MONTHS[currentDate.getMonth()];
        const monthData = transformedData[year]?.[month];
        
        const weekData = weeklyData.get(weekNumber)!;
        if (weekData && monthData) {
          const dayOfMonth = currentDate.getDate();
          const dayScore = monthData[0]?.days[dayOfMonth - 1] || 0;
          
          weekData.totalScore += dayScore;
          if (dayScore > 0) {
            weekData.daysWithData++;
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return Array.from(weeklyData.values())
        .sort((a, b) => b.weekNumber - a.weekNumber)
        .map(stats => ({
          ...stats,
          averageScore: stats.daysWithData > 0 
            ? Number((stats.totalScore / stats.daysWithData).toFixed(1))
            : 0
        }));
    } catch (error) {
      console.error('Error calculating weekly stats:', error);
      return [];
    }
  };

  // 평가 기준 정보
  const getHabitScoreInfo = (id: string) => {
    if (id === 'exercise') {
      return [
        { score: 0, title: '운동 안함', desc: '오늘 운동하지 않음' },
        { score: 1, title: '가벼운 운동', desc: '맨몸운동 10개' },
        { score: 2, title: '보통 운동', desc: '맨몸운동 50개 혹은 8천보' },
        { score: 3, title: '충분한 운동', desc: '맨몸운동 100개 혹은 만보 or 3km 이상 달리기' }
      ];
    } else if (id === 'english-reading') {
      return [
        { score: 0, title: '읽지 않음', desc: '오늘 원서를 읽지 않음' },
        { score: 1, title: '조금 읽음', desc: '5분' },
        { score: 2, title: '적당히 읽음', desc: '10분' },
        { score: 3, title: '충분히 읽음', desc: '15분' }
      ];
    } else if (id === 'reading') {
      return [
        { score: 0, title: '읽지 않음', desc: '오늘 독서하지 않음' },
        { score: 1, title: '조금 읽음', desc: '1쪽' },
        { score: 2, title: '적당히 읽음', desc: '10쪽 or 10분' },
        { score: 3, title: '충분히 읽음', desc: '20쪽 or 20분 이상' }
      ];
    } else if (id === 'english-kids') {
      return [
        { score: 0, title: '하지 않음', desc: '오늘 아이들과 영어 활동하지 않음' },
        { score: 1, title: '조금 함', desc: '리딩게이트 5점' },
        { score: 2, title: '적당히 함', desc: '리딩게이트 10점' },
        { score: 3, title: '충분히 함', desc: '리딩게이트 15점' }
      ];
    } else if (id === 'massage') {
      return [
        { score: 0, title: '하지 않음', desc: '오늘 마사지하지 않음' },
        { score: 1, title: '간단히 함', desc: '1분' },
        { score: 2, title: '적당히 함', desc: '3분' },
        { score: 3, title: '충분히 함', desc: '5분' }
      ];
    }
    
    return [];
  };

  // 건강 상태 평가 기준 정보
  const getHealthStatusInfo = (id: string) => {
    if (id === 'back-pain') {
      return [
        { score: 0, title: '통증 없음', desc: '전혀 통증이 없으며 움직임이 완전히 자유로움' },
        { score: 1, title: '약간 불편함', desc: '가벼운 뻣뻣함, 15-20분 내 자연스럽게 완화' },
        { score: 2, title: '중간 통증', desc: '확실한 통증, 스트레칭으로 어느 정도 완화 가능' },
        { score: 3, title: '심한 통증', desc: '움직임 제한, 일상생활에 영향' }
      ];
    } else if (id === 'esophagitis') {
      return [
        { score: 0, title: '전혀 없음', desc: '어떠한 불편감이나 통증도 없음' },
        { score: 1, title: '약함', desc: '가끔 약간의 불편감, 일상생활 지장 없음' },
        { score: 2, title: '중간', desc: '불편감이 분명하나 견딜만한 수준' },
        { score: 3, title: '심함', desc: '확실한 통증, 일상생활에 지장' }
      ];
    }
    return [];
  };

  if (isLoading) {
    return <div>데이터를 불러오는 중...</div>;
  }

  return (
    <Box
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
        borderRadius: 3,
        minHeight: '100vh',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          p: 3,
          background: 'white',
          borderRadius: 2,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          오늘의 습관
        </Typography>
      </Box>

      {/* 날짜 선택 */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
        <input
          type="date"
          value={`${currentYear}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          style={{
            padding: '8px',
            fontSize: '1rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
      </Box>

      {/* 습관 점수 입력 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 일반 습관 섹션 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500 }}>
              일상 습관
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowSecondaryHabits(!showSecondaryHabits)}
              sx={{ fontSize: '0.75rem' }}
            >
              {showSecondaryHabits ? '기본만 보기' : '모든 습관 보기'}
            </Button>
          </Box>
          <Grid container spacing={3}>
            {HABITS.filter(habit => {
              if (HEALTH_STATUS_HABITS.includes(habit.id)) return false;
              if (SECONDARY_HABITS.includes(habit.id)) return showSecondaryHabits;
              return PRIMARY_HABITS.includes(habit.id);
            }).map((habit, index) => {
          const realIndex = HABITS.findIndex(h => h.id === habit.id);
          const weeklyAverage = calculate8WeekAverage(realIndex);
          const currentWeekScore = getCurrentWeekScore(realIndex);
          const remainingScore = Math.max(0, weeklyAverage - currentWeekScore);
          
          // 월간 목표 계산
          const monthlyTarget = getPreviousMonthTotal(realIndex);
          const today = getKoreanDate();
          const currentYear = today.getFullYear().toString();
          const currentMonth = MONTHS[today.getMonth()];
          const currentDay = today.getDate();
          
          // 이번 달 현재까지 누적 점수
          let monthlyCurrentScore = 0;
          for (let day = 1; day <= currentDay; day++) {
            const habitData = transformedData[currentYear]?.[currentMonth]?.[realIndex];
            if (habitData?.days) {
              const dayScore = habitData.days[day - 1] || 0;
              monthlyCurrentScore += dayScore;
            }
          }
          
          return (
            <Grid item xs={12} sm={6} md={4} key={habit.id}>
                  <Paper 
                    sx={{ 
                      p: 2,
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                  >
                <Typography variant="h6" sx={{ color: habit.color, mb: 2 }}>
                  {habit.title}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                      (0: 안함 ~ 3: 충분히 함)
                    </Typography>
                    <Box sx={{ 
                      fontSize: '0.75rem', 
                      color: 'text.secondary',
                      p: 1,
                      bgcolor: 'rgba(0,0,0,0.02)',
                      borderRadius: 1,
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      {(() => {
                        const scoreInfo = getHabitScoreInfo(habit.id);
                        console.log(`Rendering ${habit.id}, scoreInfo length:`, scoreInfo.length);
                        
                        // 기본 점수 기준이 없으면 일반적인 기준 표시
                        if (scoreInfo.length === 0) {
                          return [
                            { score: 0, title: '안함', desc: '오늘 실행하지 않음' },
                            { score: 1, title: '조금', desc: '짧은 시간 실행' },
                            { score: 2, title: '적당히', desc: '적당한 시간 실행' },
                            { score: 3, title: '충분히', desc: '충분한 시간 실행' }
                          ].map((info) => (
                            <Box key={info.score} sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}>
                              <Box component="span" sx={{ 
                                display: 'inline-block',
                                width: 20,
                                height: 20,
                                lineHeight: '20px',
                                textAlign: 'center',
                                borderRadius: '50%',
                                bgcolor: `${habit.color}${20 + info.score * 20}`,
                                color: info.score > 1 ? 'white' : 'inherit',
                                mr: 1,
                                fontSize: '0.7rem'
                              }}>
                                {info.score}
                              </Box>
                              <Box component="span" sx={{ fontWeight: 'bold' }}>{info.title}</Box>
                              <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                                - {info.desc}
                              </Box>
                            </Box>
                          ));
                        }
                        
                        return scoreInfo.map((info) => (
                          <Box key={info.score} sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}>
                            <Box component="span" sx={{ 
                              display: 'inline-block',
                              width: 20,
                              height: 20,
                              lineHeight: '20px',
                              textAlign: 'center',
                              borderRadius: '50%',
                              bgcolor: `${habit.color}${20 + info.score * 20}`,
                              color: info.score > 1 ? 'white' : 'inherit',
                              mr: 1,
                              fontSize: '0.7rem'
                            }}>
                              {info.score}
                            </Box>
                            <Box component="span" sx={{ fontWeight: 'bold' }}>{info.title}</Box>
                            <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                              - {info.desc}
                            </Box>
                          </Box>
                        ));
                      })()}
                    </Box>
                  </Box>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[0, 1, 2, 3].map((score) => {
                    const currentScore = transformedData[selectedDate.getFullYear().toString()]?.[MONTHS[selectedDate.getMonth()]]?.[realIndex]?.days?.[selectedDate.getDate() - 1] || 0;
                    return (
                      <Button
                        key={score}
                        variant={currentScore === score ? 'contained' : 'outlined'}
                        onClick={() => handleScoreUpdate(realIndex, score)}
                        sx={{
                          minWidth: '40px',
                          height: '40px',
                          bgcolor: currentScore === score ? habit.color : 'transparent',
                          color: currentScore === score ? 'white' : habit.color,
                          borderColor: habit.color,
                          '&:hover': {
                            bgcolor: currentScore === score ? habit.color : `${habit.color}20`,
                          }
                        }}
                      >
                        {score}
                      </Button>
                    );
                  })}
                </Box>
                <Box sx={{ 
                  mt: 1, 
                  p: 1, 
                  bgcolor: 'rgba(0,0,0,0.03)', 
                  borderRadius: 1,
                  fontSize: '0.85rem'
                }}>
                  <div style={{ marginBottom: '6px' }}>
                    <strong>📊 주간 통계</strong>
                  </div>
                  <div>• 지난 8주 평균: {weeklyAverage}점</div>
                  <div>• 이번 주 현재: {currentWeekScore}점</div>
                  {remainingScore > 0 && (
                    <div style={{ color: habit.color, fontWeight: 'bold', marginTop: '4px' }}>
                      • 평균 달성까지 {remainingScore}점 남음
                    </div>
                  )}
                  
                  <div style={{ marginTop: '8px', marginBottom: '6px' }}>
                    <strong>🎯 월간 목표</strong>
                  </div>
                  <div>• 목표: {monthlyTarget}점 (이번 달 총 일수 × 3점)</div>
                  <div>• 현재: {monthlyCurrentScore}점</div>
                  <div style={{ 
                    color: monthlyCurrentScore >= (monthlyTarget * currentDay / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()) 
                      ? '#4caf50' : habit.color, 
                    fontWeight: 'bold' 
                  }}>
                    • 진행률: {monthlyCurrentScore}점 / {Math.round(monthlyTarget * currentDay / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())}점 
                    ({Math.round((monthlyCurrentScore / (monthlyTarget * currentDay / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())) * 100)}%)
                  </div>
                </Box>
              </Paper>
            </Grid>
          );
        })}
          </Grid>
      </Grid>

        {/* 건강 상태 섹션 */}
        <Grid item xs={12} sx={{ mt: 4 }}>
          <Paper 
            sx={{ 
              p: 3, 
              bgcolor: 'rgba(248, 249, 250, 1)',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500 }}>
                건강 상태 체크
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowHealthStatus(!showHealthStatus)}
                sx={{ fontSize: '0.75rem' }}
              >
                {showHealthStatus ? '숨기기' : '보기'}
              </Button>
            </Box>
            {showHealthStatus && (
              <Grid container spacing={3}>
                {HABITS.filter(habit => HEALTH_STATUS_HABITS.includes(habit.id)).map((habit, index) => {
                const realIndex = HABITS.findIndex(h => h.id === habit.id);
                const weeklyAverage = calculate8WeekAverage(realIndex);
                const currentWeekScore = getCurrentWeekScore(realIndex);
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={habit.id}>
                    <Paper 
                      sx={{ 
                        p: 2,
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 3
                        }
                      }}
                    >
                      <Typography variant="h6" sx={{ color: habit.color, mb: 2 }}>
                        {habit.title}
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                            (0: 좋음 ~ 3: 나쁨)
                          </Typography>
                          <Box sx={{ 
                            fontSize: '0.75rem', 
                            color: 'text.secondary',
                            p: 1,
                            bgcolor: 'rgba(0,0,0,0.02)',
                            borderRadius: 1,
                            border: '1px solid rgba(0,0,0,0.05)'
                          }}>
                            {getHealthStatusInfo(habit.id).map((info) => (
                              <Box key={info.score} sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}>
                                <Box component="span" sx={{ 
                                  display: 'inline-block',
                                  width: 20,
                                  height: 20,
                                  lineHeight: '20px',
                                  textAlign: 'center',
                                  borderRadius: '50%',
                                  bgcolor: `${habit.color}${info.score * 30}`,
                                  color: info.score > 1 ? 'white' : 'inherit',
                                  mr: 1,
                                  fontSize: '0.7rem'
                                }}>
                                  {info.score}
                                </Box>
                                <Box component="span" sx={{ fontWeight: 'bold' }}>{info.title}</Box>
                                <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                                  - {info.desc}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {[0, 1, 2, 3].map((score) => {
                          const currentScore = transformedData[selectedDate.getFullYear().toString()]?.[MONTHS[selectedDate.getMonth()]]?.[realIndex]?.days?.[selectedDate.getDate() - 1] || 0;
                          return (
        <Button
                              key={score}
                              variant={currentScore === score ? 'contained' : 'outlined'}
                              onClick={() => handleScoreUpdate(realIndex, score)}
          sx={{
                                minWidth: '40px',
                                height: '40px',
                                bgcolor: currentScore === score ? habit.color : 'transparent',
                                color: currentScore === score ? 'white' : habit.color,
                                borderColor: habit.color,
            '&:hover': {
                                  bgcolor: currentScore === score ? habit.color : `${habit.color}20`,
            }
          }}
        >
                              {score}
        </Button>
                          );
                        })}
      </Box>
                      <Box sx={{ 
                        mt: 1, 
                        p: 1, 
                        bgcolor: 'rgba(0,0,0,0.03)', 
                        borderRadius: 1,
                        fontSize: '0.9rem'
                      }}>
                        <div>지난 5주 평균: {weeklyAverage}점</div>
                        <div>이번 주 평균: {(currentWeekScore / Math.max(1, getCurrentWeekDays())).toFixed(1)}점</div>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 주요 습관 현황 */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
            주요 습관 현황
          </Typography>
          <Tooltip 
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  연속 달성일 계산 방법 📊
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • <strong>관대한 계산:</strong> 최대 2일까지 건너뛰기 허용
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • <strong>점수 기준:</strong> 1점 이상 기록 시 달성으로 인정
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • <strong>연속 유지:</strong> 가끔 쉬어도 연속 기록 유지 가능
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontStyle: 'italic', mt: 1 }}>
                  예: 운동-휴식-휴식-운동 = 4일 연속 달성 ✅
                </Typography>
              </Box>
            }
            arrow
            placement="top"
          >
            <IconButton size="small" sx={{ opacity: 0.7 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      <Grid container spacing={3}>
          {HABITS.filter(habit => PRIMARY_HABITS.includes(habit.id)).map((habit, index) => (
            <Grid item xs={12} md={4} key={habit.id}>
              <Paper 
                elevation={2}
                sx={{ 
                  p: 2.5,
                  borderRadius: 2,
                  borderLeft: `6px solid ${habit.color}`,
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontWeight: 600,
                    color: habit.color,
                    fontSize: '1.1rem'
                  }}
                >
                  {habit.title}
                </Typography>
                <Stack direction="row" spacing={4} sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      현재 연속
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {calculateStreak(index)}
                      </Typography>
                      {calculateStreak(index) >= 3 && (
                        <LocalFireDepartmentIcon sx={{ color: 'orange', fontSize: '1.5rem' }} />
                      )}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      최고 기록
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {calculateBestStreak(index)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
        </Grid>
          ))}
        </Grid>
      </Box>

      {/* 월간 습관 기록 */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
            월간 습관 기록
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>연도</InputLabel>
              <Select
                value={selectedYear}
                label="연도"
                onChange={(e) => {
                  const year = Number(e.target.value);
                  setSelectedYear(year);
                  setSelectedDate(new Date(year, selectedMonth, 1));
                }}
              >
                {Array.from({ length: 2 }, (_, i) => 2025 - i).map((year) => (
                  <MenuItem key={year} value={year}>{year}년</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>월</InputLabel>
              <Select
                value={selectedMonth}
                label="월"
                onChange={(e) => {
                  const month = Number(e.target.value);
                  setSelectedMonth(month);
                  setSelectedDate(new Date(selectedYear, month, 1));
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                  <MenuItem key={month} value={month}>{month + 1}월</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Grid container spacing={3}>
          {HABITS.filter(habit => PRIMARY_HABITS.includes(habit.id)).map((habit) => {
            const realIndex = HABITS.findIndex(h => h.id === habit.id);
            // 해당 월의 첫 날과 마지막 날 계산
            const firstDay = new Date(selectedYear, selectedMonth, 1);
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
            const totalDays = lastDay.getDate();

            // 6x7 그리드 초기화
            const grid: number[][] = Array(6).fill(0).map(() => Array(7).fill(-1));

            // 달력 채우기 로직 수정
            const monthData = transformedData[selectedYear.toString()]?.[MONTHS[selectedMonth]]?.[realIndex]?.days || Array(31).fill(0);
            
            let currentDay = 1;
            const firstDayOfMonth = firstDay.getDay(); // 해당 월의 1일의 요일 (0: 일요일, 6: 토요일)

            for (let week = 0; week < 6; week++) {
              for (let day = 0; day < 7; day++) {
                if (week === 0 && day < firstDayOfMonth) {
                  grid[week][day] = -1; // 이전 달의 날짜
                } else if (currentDay <= totalDays) {
                  grid[week][day] = monthData[currentDay - 1];
                  currentDay++;
                } else {
                  grid[week][day] = -1; // 다음 달의 날짜
                }
              }
            }

            // 실제 사용된 주 수만큼 잘라내기 (빈 주는 제외)
            const data = grid.filter(week => week.some(day => day !== -1));
            console.log(`${habit.title} 달력 데이터:`, data);

            return (
              <Grid item xs={12} md={6} key={habit.id}>
                <Paper 
                  elevation={2}
                  sx={{ 
                    p: 2.5, 
                    borderRadius: 2,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 2, 
                      color: habit.color, 
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  >
                    {habit.title}
                  </Typography>
                  <Box sx={{ width: '100%', height: '130px' }}>
                    <HeatMapGrid
                      data={data}
                      xLabels={['일', '월', '화', '수', '목', '금', '토']}
                      yLabels={Array(data.length).fill(0).map((_, i) => `${i + 1}주`)}
                      cellHeight="22px"
                      cellRender={(_x: number, _y: number, value: number) => (
                        <div title={`${value}점`}>
                          {value > 0 ? value : ''}
                        </div>
                      )}
                      cellStyle={(_x: number, _y: number, value: number) => {
                        if (value === -1) return { background: 'transparent' };
                        const maxValue = 3;
                        const intensity = Math.min(value / maxValue, 1);
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(habit.color);
                        let background = habit.color;
                        if (result) {
                          const r = parseInt(result[1], 16);
                          const g = parseInt(result[2], 16);
                          const b = parseInt(result[3], 16);
                          background = `rgba(${r}, ${g}, ${b}, ${intensity})`;
                        }
                        return {
                          background,
                          fontSize: '11px',
                          color: value > 1.5 ? '#fff' : '#000',
                          border: value === -1 ? 'none' : '1px solid #fff',
                          borderRadius: '2px'
                        };
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            );
          })}
      </Grid>
      </Box>

      {/* 최근 5주 트렌드 모음 */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#333', fontWeight: 500 }}>
          최근 8주 트렌드
        </Typography>
        <Grid container spacing={3}>
          {HABITS.filter(habit => PRIMARY_HABITS.includes(habit.id)).map((habit) => {
            const realIndex = HABITS.findIndex(h => h.id === habit.id);
            return (
            <Grid item xs={12} md={6} key={habit.id}>
              <Paper 
                elevation={2}
                sx={{ 
                  p: 2.5,
                  borderRadius: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, color: habit.color, fontWeight: 600 }}>
                  {habit.title}
                </Typography>
                <WeeklyTrend
                  data={calculateLast8WeeksData(realIndex)}
                  habitName={habit.title}
                  color={habit.color}
                />
              </Paper>
            </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* 트윗 공유 버튼 */}
      <Box sx={{ mb: 6 }}>
        <Button
          variant="contained"
          onClick={shareTweet}
          sx={{
            bgcolor: '#1DA1F2',
            color: 'white',
            '&:hover': {
              bgcolor: '#1a91da'
            }
          }}
        >
          트위터로 공유하기
        </Button>
      </Box>
    </Box>
  );
};

export default HabitTracker;
