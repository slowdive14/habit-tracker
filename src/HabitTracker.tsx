import React, { useState, useEffect } from 'react';
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
  Stack
} from '@mui/material';
import { User } from 'firebase/auth';
import { HeatMapGrid } from 'react-grid-heatmap';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WeeklyTrend from './components/WeeklyTrend';
import HabitStats from './components/HabitStats';
import HabitInsight from './components/HabitInsight';

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
  { id: 'english-reading', name: 'English Reading', color: '#E69F00', title: '영어 읽기' },
  { id: 'reading', name: 'Reading', color: '#009E73', title: '독서' },
  { id: 'english-kids', name: 'English with kids', color: '#D55E00', title: '아이들과 영어' },
  { id: 'massage', name: 'Wife Massage', color: '#CC79A7', title: '아내 마사지' },
  { id: 'back-pain', name: 'Back Pain', color: '#882255', title: '등 결림' },
  { id: 'esophagitis', name: 'Esophagitis', color: '#661188', title: '식도염' },
  { id: 'stool-condition', name: 'Stool Condition', color: '#44AA99', title: '대변 상태' },
];

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
  koreanDate.setHours(koreanDate.getHours() + 9);
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
  const result: HabitData = {};
  const currentYear = new Date().getFullYear().toString();
  
  // 기존 데이터가 없는 경우
  if (!rawData) {
    result[currentYear] = {};
    MONTHS.forEach(month => {
      result[currentYear][month] = HABITS.map(habit => ({
        ...habit,
        days: Array(31).fill(0),
        weekNumbers: Array(31).fill(0).map((_, index) => 
          getWeekInfo(new Date(Number(currentYear), MONTHS.indexOf(month), index + 1)).weekNumber
        )
      }));
    });
    return result;
  }

  // 기존 데이터 복사 및 누락된 데이터 추가
  Object.keys(rawData).forEach(year => {
    result[year] = {};
    MONTHS.forEach(month => {
      if (rawData[year]?.[month]) {
        // 기존 데이터가 있는 경우
        result[year][month] = rawData[year][month].map(habitData => ({
          ...habitData,
          weekNumbers: Array(31).fill(0).map((_, index) => 
            getWeekInfo(new Date(Number(year), MONTHS.indexOf(month), index + 1)).weekNumber
          )
        }));
      } else {
        // 누락된 월에 대한 기본 데이터 생성
        result[year][month] = HABITS.map(habit => ({
          ...habit,
          days: Array(31).fill(0),
          weekNumbers: Array(31).fill(0).map((_, index) => 
            getWeekInfo(new Date(Number(year), MONTHS.indexOf(month), index + 1)).weekNumber
          )
        }));
      }
    });
  });

  // 현재 연도가 없는 경우 추가
  if (!result[currentYear]) {
    result[currentYear] = {};
    MONTHS.forEach(month => {
      result[currentYear][month] = HABITS.map(habit => ({
        ...habit,
        days: Array(31).fill(0),
        weekNumbers: Array(31).fill(0).map((_, index) => 
          getWeekInfo(new Date(Number(currentYear), MONTHS.indexOf(month), index + 1)).weekNumber
        )
      }));
    });
  }

  return result;
};

const HabitTracker: React.FC<HabitTrackerProps> = ({ user, saveHabitData, loadHabitData }) => {
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
  const [selectedHabit, setSelectedHabit] = useState<string>('All');
  const [activeHabit, setActiveHabit] = useState<HabitBase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
        if (rawData) {
          const transformed = transformDataForComponents(rawData);
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

    // 해당 연도와 월의 데이터가 없으면 생성
    let newData: HabitData = { ...transformedData };
    if (!newData[currentYear]) {
      newData[currentYear] = {};
    }
    if (!newData[currentYear][month]) {
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

    setTransformedData(newData);
    await saveHabitData(newData);
  };

  // 지난 5주 데이터 계산
  const calculateLast8WeeksData = (habitIndex: number): { name: string; value: number }[] => {
    try {
      // 현재 날짜 기준으로 계산
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 9); // UTC+9 (한국 시간)
      
      // 5주 전의 월요일을 시작일로 설정
      const startDate = new Date(targetDate);
      const daysSinceMonday = (targetDate.getDay() + 6) % 7; // 월요일부터 몇 일이 지났는지 계산
      startDate.setDate(targetDate.getDate() - daysSinceMonday - (4 * 7)); // 5주 전 월요일
      startDate.setHours(0, 0, 0, 0);

      const weeklyData = new Map<number, {
        weekNumber: number;
        startDate: Date;
        endDate: Date;
        totalScore: number;
        daysWithData: number;
      }>();

      let currentDate = new Date(startDate);
      while (currentDate <= targetDate) {
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

      // 정확히 5주의 데이터만 반환
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

  // 이번 주 현재까지의 점수 계산
  const getCurrentWeekScore = (habitIndex: number): number => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일로 설정

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

  // 이전 달의 총점 계산 함수
  const getPreviousMonthTotal = (habitIndex: number): number => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    const monthName = MONTHS[previousMonth.getMonth()];
    const year = previousMonth.getFullYear().toString();
    
    let total = 0;
    const habitData = transformedData[year]?.[monthName]?.[habitIndex];
    
    if (habitData?.days) {
      total = habitData.days.reduce((sum, score) => sum + (score || 0), 0);
    }
    
    return total || 60;
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

  // 오늘의 총점 계산 함수
  const calculateTodayScore = (): number => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const currentYear = today.getFullYear().toString();
    const currentMonth = MONTHS[today.getMonth()];
    const currentDay = today.getDate();
    
    let todayTotal = 0;
    const habitIndices = [0, 1, 2]; // 운동, 원서 읽기, 독서
    
    habitIndices.forEach(index => {
      const habitData = transformedData[currentYear]?.[currentMonth]?.[index];
      if (habitData?.days) {
        todayTotal += habitData.days[currentDay - 1] || 0;
      }
    });
    
    return todayTotal;
  };

  // 특정 날짜의 습관 점수를 가져오는 함수
  const getHabitScoreForDate = (habitIndex: number, date: Date): number => {
    const year = date.getFullYear().toString();
    const monthName = MONTHS[date.getMonth()];
    const day = date.getDate();
    const habitData = transformedData[year]?.[monthName]?.[habitIndex];
    return habitData?.days?.[day - 1] || 0;
  };

  // 연속 달성일 계산 함수
  const calculateStreak = (habitIndex: number): number => {
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    today.setHours(0, 0, 0, 0);  // 시간 부분을 0으로 설정
    
    let streak = 0;
    let currentDate = new Date(today);
    let maxStreak = 0;
    let currentStreak = 0;
    
    // 최근 365일 동안의 기록을 확인
    for (let i = 0; i < 365; i++) {
      const year = currentDate.getFullYear().toString();
      const month = MONTHS[currentDate.getMonth()];
      const day = currentDate.getDate();
      
      // 해당 날짜의 데이터가 있는지 확인
      const monthData = transformedData[year]?.[month];
      const hasDataForDate = monthData && monthData[habitIndex]?.days[day - 1] !== undefined;
      
      if (!hasDataForDate) {
        // 데이터가 없는 날짜는 건너뛰기
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }
      
      const score = getHabitScoreForDate(habitIndex, currentDate);
      
      if (score > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        // 0점인 경우에만 연속 기록이 끊김
        currentStreak = 0;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return currentStreak;
  };

  // 트윗 텍스트 생성 함수
  const generateTweetText = (): string => {
    const today = new Date();
    
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
    const healthStatus = [5, 6].map(index => {
      const currentYear = today.getFullYear().toString();
      const currentMonth = MONTHS[today.getMonth()];
      const currentDay = today.getDate();
      const score = transformedData[currentYear]?.[currentMonth]?.[index]?.days?.[currentDay - 1] || 0;
      return {
        name: HABITS[index].title,
        score: score
      };
    });
    
    let tweetText = `📊 ${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} 습관 기록\n\n`;
    
    tweetText += `✨ 오늘의 총점: ${todayScore}/15\n`;
    
    if (streakData.length > 0) {
      tweetText += `🔥 연속 달성: ${streakData.map(item => `${item.name} ${item.streak}일`).join(', ')}\n`;
    }
    
    tweetText += `\n📈 월간 진행\n`;
    monthlyProgress.forEach(item => {
      tweetText += `${item.name}: ${item.progress.current}/${item.progress.target}점\n`;
    });

    tweetText += `\n🏥 건강 상태 (0:좋음~3:나쁨)\n`;
    healthStatus.forEach(item => {
      tweetText += `${item.name}: ${item.score}점\n`;
    });
    
    tweetText += `\n💪 내일을 위한 짧은 다짐:\n\n`;
    tweetText += `#습관모니터링`;
    
    return tweetText;
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
    } else if (id === 'stool-condition') {
      return [
        { score: 0, title: '매우 나쁨', desc: '물처럼 묽은 설사, 불규칙한 형태' },
        { score: 1, title: '나쁨', desc: '무른 변, 형태가 불안정함' },
        { score: 2, title: '양호', desc: '약간 무른 편이나 형태 유지, 배변이 수월함' },
        { score: 3, title: '매우 좋음', desc: '바나나 모양의 부드러운 변, 배변이 편안하고 규칙적' }
      ];
    }
    return [];
  };

  if (isLoading) {
    return <div>데이터를 불러오는 중...</div>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
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
          <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 500 }}>
            일상 습관
          </Typography>
          <Grid container spacing={3}>
            {HABITS.filter(habit => !['back-pain', 'esophagitis', 'stool-condition'].includes(habit.id)).map((habit, index) => {
              const weeklyAverage = calculate8WeekAverage(index);
              const currentWeekScore = getCurrentWeekScore(index);
              const remainingScore = Math.max(0, weeklyAverage - currentWeekScore);
              
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
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {[0, 1, 2, 3].map((score) => {
                        const currentScore = transformedData[selectedDate.getFullYear().toString()]?.[MONTHS[selectedDate.getMonth()]]?.[index]?.days?.[selectedDate.getDate() - 1] || 0;
                        return (
                          <Button
                            key={score}
                            variant={currentScore === score ? 'contained' : 'outlined'}
                            onClick={() => handleScoreUpdate(index, score)}
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
                      <div>이번 주 현재: {currentWeekScore}점</div>
                      {remainingScore > 0 && (
                        <div style={{ color: habit.color, fontWeight: 'bold', marginTop: '4px' }}>
                          평균 달성까지 {remainingScore}점 남음
                        </div>
                      )}
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
            <Typography variant="h6" sx={{ mb: 3, color: 'text.primary', fontWeight: 500 }}>
              건강 상태 체크
            </Typography>
            <Grid container spacing={3}>
              {HABITS.filter(habit => ['back-pain', 'esophagitis', 'stool-condition'].includes(habit.id)).map((habit, index) => {
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
          </Paper>
        </Grid>
      </Grid>

      {/* 주요 습관 현황 */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, color: 'text.primary' }}>
          주요 습관 현황
        </Typography>
        <Grid container spacing={3}>
          {HABITS.slice(0, 3).map((habit, index) => (
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
                      {calculateStreak(index)}
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
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, color: 'text.primary' }}>
          월간 습관 기록
        </Typography>
        <Grid container spacing={3}>
          {HABITS.map((habit, index) => {
            // 해당 월의 첫 날과 마지막 날 계산
            const firstDay = new Date(Number(selectedDate.getFullYear()), selectedDate.getMonth(), 1);
            const lastDay = new Date(Number(selectedDate.getFullYear()), selectedDate.getMonth() + 1, 0);
            const totalDays = lastDay.getDate();

            // 6x7 그리드 초기화
            const grid: number[][] = Array(6).fill(0).map(() => Array(7).fill(-1));

            // 달력 채우기
            let currentDay = 1;
            const monthData = transformedData[selectedDate.getFullYear().toString()]?.[MONTHS[selectedDate.getMonth()]]?.[index]?.days || Array(31).fill(0);
            
            for (let week = 0; week < 6; week++) {
              for (let day = 0; day < 7; day++) {
                if (week === 0 && day < firstDay.getDay()) continue;
                if (currentDay > totalDays) continue;
                grid[week][day] = monthData[currentDay - 1] || 0;
                currentDay++;
              }
            }

            // 실제 사용된 주 수만큼 잘라내기
            const data = grid.filter(week => week.some(day => day !== -1));

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
          최근 5주 트렌드
        </Typography>
        <Grid container spacing={3}>
          {HABITS.map((habit, index) => (
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
                  data={calculateLast8WeeksData(index)}
                  habitName={habit.title}
                  color={habit.color}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 연간 트렌드 섹션 */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#333', fontWeight: 500 }}>
          연간 트렌드
        </Typography>
        <Paper 
          elevation={2}
          sx={{ 
            p: 3,
            borderRadius: 2
          }}
        >
          <HabitInsight
            habitData={transformedData}
            habits={HABITS}
          />
        </Paper>
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
