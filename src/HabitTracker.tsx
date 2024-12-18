import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Button, Select, MenuItem } from '@mui/material';
import { User } from 'firebase/auth';
import WeeklyTrend from './components/WeeklyTrend';
import HabitStats from './components/HabitStats';
import HabitInsight from './components/HabitInsight';
import HabitHeatmap from './components/HabitHeatmap';

// Types
interface HabitData {
  [month: string]: Array<{
    name: string;
    color: string;
    title: string;
    days: number[];
  }>;
}

interface HabitBase {
  id: string;
  name: string;
  color: string;
  title: string;
}

interface HabitTrackerProps {
  user: User;
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
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_KR = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
];

// 데이터 변환 유틸리티 함수
const transformDataForComponents = (rawData: HabitData | null): HabitData => {
  const result: HabitData = {};
  
  if (!rawData) {
    // 현재 월에 대해서만 기본 데이터 생성
    const currentMonth = MONTHS[new Date().getMonth()];
    result[currentMonth] = HABITS.map(habit => ({
      ...habit,
      days: Array(31).fill(0)
    }));
    return result;
  }

  // 각 월에 대해 처리
  for (const month in rawData) {
    const habits = rawData[month];
    result[month] = HABITS.map((habit, index) => ({
      ...habit,
      days: habits[index]?.days && Array.isArray(habits[index].days) 
        ? [...habits[index].days]
        : Array(31).fill(0)
    }));
  }
  // 현재 월이 없으면 추가
  const currentMonth = MONTHS[new Date().getMonth()];
  if (!result[currentMonth]) {
    result[currentMonth] = HABITS.map(habit => ({
      ...habit,
      days: Array(31).fill(0)
    }));
  }
  return result;
};

// 한국 기준 2024년 주차 계산 함수
const getKoreanWeekData = (date: Date): { weekNumber: number; weekStart: Date; weekEnd: Date } => {
  // 2024년 1월 1일 (기준일)
  const firstDay2024 = new Date(2024, 0, 1);
  const diffTime = date.getTime() - firstDay2024.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  // 해당 주의 시작일(월요일)과 종료(일) 계산
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // 월요일로 조정
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // 일요일

  return {
    weekNumber,
    weekStart,
    weekEnd
  };
};

const HabitTracker: React.FC<HabitTrackerProps> = ({ user, saveHabitData, loadHabitData }) => {
  const [transformedData, setTransformedData] = useState<HabitData>(() => {
    // 초기 상태를 빈 데이터로 설정
    const currentMonth = MONTHS[new Date().getMonth()];
    return {
      [currentMonth]: HABITS.map(habit => ({
        ...habit,
        days: Array(31).fill(0)
      }))
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [selectedHabit, setSelectedHabit] = useState<string>('All');
  const [activeHabit, setActiveHabit] = useState<HabitBase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 현재 날짜 정보
  const today = new Date();
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
    const month = MONTHS[selectedDate.getMonth()];
    const day = selectedDate.getDate() - 1;

    // 해당 월의 데이터가 없으면 생성
    let newData: HabitData = { ...transformedData };
    if (!newData[month]) {
      newData = {
        ...newData,
        [month]: HABITS.map(habit => ({
          ...habit,
          days: Array(31).fill(0)
        }))
      };
    }

    // 점수 업데이트
    newData = {
      ...newData,
      [month]: newData[month].map((habit, index) => {
        if (index === habitIndex) {
          const newDays = [...habit.days];
          newDays[day] = score;
          return { ...habit, days: newDays };
        }
        return habit;
      })
    };

    setTransformedData(newData);
    await saveHabitData(newData);
  };

  // 지난 8주 데이터 계산
  const calculateLast8WeeksData = (habitIndex: number): { name: string; value: number }[] => {
    try {
      // 오늘 날짜 기준으로 계산
      const today = new Date();
      
      // 8주 전 날짜 계산
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 55); // 8주 전

      // 주차별 데이터를 저장할 Map
      const weeklyData = new Map<number, { 
        weekNumber: number; 
        startDate: Date; 
        endDate: Date; 
        totalScore: number; 
        daysWithData: number;
      }>();

      // 날짜 범위 내의 모든 날짜에 대해 처리
      let currentDate = new Date(startDate);
      while (currentDate <= today) {
        const { weekNumber, weekStart, weekEnd } = getKoreanWeekData(currentDate);
        
        // 해당 주차의 데이터가 없으면 초기화
        if (!weeklyData.has(weekNumber)) {
          weeklyData.set(weekNumber, {
            weekNumber,
            startDate: weekStart,
            endDate: weekEnd,
            totalScore: 0,
            daysWithData: 0
          });
        }
        
        // 현재 날짜의 월과 데이터
        const month = MONTHS[currentDate.getMonth()];
        const monthData = transformedData[month];
        
        // 현재 날짜의 데이터가 있으면 합산
        const weekData = weeklyData.get(weekNumber);
        if (weekData && monthData && monthData[habitIndex]?.days) {
          const dayScore = Number(monthData[habitIndex].days[currentDate.getDate() - 1]) || 0;
          weekData.totalScore += dayScore;
          if (dayScore > 0) weekData.daysWithData++;
        }

        // 다음 날짜로
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 주차 데이터를 배열로 변환하고 날짜 범위 포맷팅
      return Array.from(weeklyData.values())
        .map(week => {
          const startMonth = week.startDate.getMonth() + 1;
          const endMonth = week.endDate.getMonth() + 1;
          const startDate = week.startDate.getDate();
          const endDate = week.endDate.getDate();

          // 날짜 범위 포맷팅 (MM/DD-MM/DD 형식)
          const dateRange = `${startMonth}/${startDate}~${endMonth}/${endDate}`;

          // 총합 점수 반환 (최대 21점)
          return {
            name: dateRange,
            value: Math.min(21, week.totalScore)
          };
        })
        .slice(-8); // 마지막 8주 데이터만 반환
    } catch (error) {
      console.error('Error calculating weekly data:', error);
      return [];
    }
  };

  // 8주 평균 점수 계산
  const calculate8WeekAverage = (habitIndex: number): number => {
    const weeklyData = calculateLast8WeeksData(habitIndex);
    if (weeklyData.length === 0) return 0;
    
    // 이번 주를 제외한 데이터만 사용하여 평균 계산
    const previousWeeksData = weeklyData.slice(0, -1);
    if (previousWeeksData.length === 0) return 0;
    
    const totalScore = previousWeeksData.reduce((sum, week) => sum + week.value, 0);
    return Math.round(totalScore / previousWeeksData.length);
  };

  // 이번 주 현재까지의 점수 계산
  const getCurrentWeekScore = (habitIndex: number): number => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // 월요일로 설정

    let score = 0;
    
    // 이번 주의 각 날짜에 대해 점수 계산
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(startOfWeek.getDate() + i);
      
      // 오늘 이후의 날짜는 계산하지 않음
      if (checkDate > today) break;
      
      // 해당 날짜의 월과 일 구하기
      const month = MONTHS[checkDate.getMonth()];
      const dayOfMonth = checkDate.getDate();
      
      // 해당 월의 데이터가 있는지 확인
      const monthData = transformedData[month];
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
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    const monthName = MONTHS[previousMonth.getMonth()];
    
    let total = 0;
    const habitData = transformedData[monthName]?.[habitIndex];
    
    if (habitData?.days) {
      total = habitData.days.reduce((sum, score) => sum + (score || 0), 0);
    }
    
    // 이전 달 데이터가 없으면 기본값으로 60점 반환 (하루 2점 기준)
    return total || 60;
  };

  // 월간 목표 진행률 계산 함수 (현재 점수/이전 달 총점)
  const calculateMonthProgress = (habitIndices: number[]): { current: number; target: number } => {
    const today = new Date();
    const currentMonth = MONTHS[today.getMonth()];
    const currentDay = today.getDate();
    
    let currentScore = 0;
    let targetScore = 0;
    
    // habitIndices는 항상 단일 습관의 인덱스를 포함하는 배열
    const habitIndex = habitIndices[0];
    const habitData = transformedData[currentMonth]?.[habitIndex];
    
    if (habitData?.days) {
      // 이번 달 1일부터 오늘까지의 실제 점수 합산
      for (let day = 0; day < currentDay; day++) {
        currentScore += habitData.days[day] || 0;
      }
      
      // 목표 점수는 이전 달의 총점
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
    const currentMonth = MONTHS[today.getMonth()];
    const currentDay = today.getDate();
    
    let todayTotal = 0;
    const habitIndices = [0, 1, 2]; // 운동, 원서 읽기, 독서
    
    habitIndices.forEach(index => {
      const habitData = transformedData[currentMonth]?.[index];
      if (habitData?.days) {
        todayTotal += habitData.days[currentDay - 1] || 0;
      }
    });
    
    return todayTotal;
  };

  // 특정 날짜의 습관 점수를 가져오는 함수
  const getHabitScoreForDate = (habitIndex: number, date: Date): number => {
    const monthName = MONTHS[date.getMonth()];
    const day = date.getDate();
    const habitData = transformedData[monthName]?.[habitIndex];
    return habitData?.days?.[day - 1] || 0;
  };

  // 연속 달성일 계산 함수
  const calculateStreak = (habitIndex: number): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // 시간 부분을 0으로 설정
    
    let streak = 0;
    let currentDate = new Date(today);
    
    // 오늘부터 시작해서 과거로 거슬러 올라가며 연속 달성 확인
    while (true) {
      const monthName = MONTHS[currentDate.getMonth()];
      const day = currentDate.getDate();
      const score = getHabitScoreForDate(habitIndex, currentDate);
      
      // 점수가 0 이하면 연속 달성 중단
      if (score <= 0) {
        break;
      }
      
      streak++;
      
      // 이전 날짜로 이동
      currentDate.setDate(currentDate.getDate() - 1);
      
      // 1년 이상의 연속은 고려하지 않음
      if (streak > 365) {
        break;
      }
    }
    
    return streak;
  };

  // 트윗 텍스트 생성 함수
  const generateTweetText = (): string => {
    const today = new Date();
    
    // 오늘의 총점 계산
    const todayScore = calculateTodayScore();
    
    // 연속 달성 계산 (운동, 원서 읽기, 독서)
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
    
    // 월간 진행률 계산
    const monthlyProgress = [0, 1, 2].map(index => ({
      name: HABITS[index].title,
      progress: calculateMonthProgress([index])
    }));
    
    // 트윗 텍스트 생성
    let tweetText = `📊 ${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} 습관 기록\n\n`;
    
    // 오늘의 총점
    tweetText += `✨ 오늘의 총점: ${todayScore}/15\n`;
    
    // 연속 달성 (최소 1일 이상인 경우만 표시)
    if (streakData.length > 0) {
      tweetText += `🔥 연속 달성: ${streakData.map(item => `${item.name} ${item.streak}일`).join(', ')}\n`;
    }
    
    // 월간 진행
    tweetText += `\n📈 월간 진행\n`;
    monthlyProgress.forEach(item => {
      tweetText += `${item.name}: ${item.progress.current}/${item.progress.target}점\n`;
    });
    
    // 다짐
    tweetText += `\n💪 내일을 위한 짧은 다짐:\n\n`;
    tweetText += `#습관모니터링`;
    
    return tweetText;
  };

  // 트윗 공유 함수
  const shareTweet = (): void => {
    const tweetText = generateTweetText();
    const encodedText = encodeURIComponent(tweetText);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    // 트위터 공유 창 열기 (팝업)
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
        {HABITS.map((habit, index) => {
          const weeklyAverage = calculate8WeekAverage(index);
          const currentWeekScore = getCurrentWeekScore(index);
          const remainingScore = Math.max(0, weeklyAverage - currentWeekScore);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={habit.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ color: habit.color, mb: 2 }}>
                  {habit.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[0, 1, 2, 3].map((score) => {
                    const currentScore = transformedData[MONTHS[selectedDate.getMonth()]]?.[index]?.days?.[selectedDate.getDate() - 1] || 0;
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
                  <div>지난 8주 평균: {weeklyAverage}점</div>
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

      {/* 트윗 공유 버튼 */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          onClick={shareTweet}
          sx={{
            bgcolor: '#1DA1F2', // Twitter blue
            color: 'white',
            '&:hover': {
              bgcolor: '#1a91da'
            }
          }}
        >
          트위터로 공유하기
        </Button>
      </Box>

      {/* 상세 분석 */}
      <Box sx={{ mb: 4 }}>
        <HabitInsight
          habitData={transformedData}
          habitName={HABITS[0].title}
        />
      </Box>

      {/* 월근 8주 트렌드 모음 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#333' }}>
          최근 8주 트렌드
        </Typography>
        <Grid container spacing={3}>
          {HABITS.map((habit, index) => (
            <Grid item xs={12} md={6} key={habit.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: habit.color }}>
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

      {/* 월 선택 */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          {MONTHS.map((month, index) => (
            <MenuItem key={month} value={month}>
              {MONTHS_KR[index]}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* 월별 히트맵 모음 */}
      <Box>
        <Typography variant="h6" sx={{ mb: 3, color: '#333' }}>
          {MONTHS_KR[MONTHS.indexOf(selectedMonth)]} 기록
        </Typography>
        <Grid container spacing={3}>
          {HABITS.map((habit, index) => (
            <Grid item xs={12} md={6} key={habit.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: habit.color }}>
                  {habit.title}
                </Typography>
                <HabitHeatmap
                  habitData={transformedData[selectedMonth][index].days}
                  month={MONTHS.indexOf(selectedMonth)}
                  year={currentYear}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default HabitTracker;
