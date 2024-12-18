import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import TrendLine from './TrendLine';

const HabitInsightContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 5px;
`;

const ErrorMessage = styled.div`
  padding: 15px;
  background-color: #fff0f0;
  border-radius: 5px;
  color: #d32f2f;
  margin-top: 15px;
`;

const Selectors = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
`;

const SelectorBox = styled.div`
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  color: #666;
  font-size: 0.9em;
`;

const SelectInput = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  color: #333;
  background: white;

  &:focus {
    outline: none;
    border-color: #90caf9;
    box-shadow: 0 0 0 2px rgba(144, 202, 249, 0.2);
  }
`;

const StreakSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
`;

const StreakBox = styled.div`
  background: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  &.current {
    background: #e3f2fd;
    border: 1px solid #90caf9;
  }
`;

const StreakTitle = styled.h4`
  margin: 0;
  color: #666;
  font-size: 0.9em;
`;

const StreakNumber = styled.p`
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin: 10px 0 0;
`;

const StreakPeriod = styled.p`
  font-size: 0.8em;
  color: #666;
  margin: 5px 0 0;
  padding: 2px 8px;
  background-color: #f5f5f5;
  border-radius: 12px;
  display: inline-block;
`;

const AnalysisSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const AchievementRate = styled.div`
  font-size: 2em;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const RateChange = styled.span`
  font-size: 0.6em;
  padding: 4px 8px;
  border-radius: 12px;
  background-color: #f5f5f5;

  &.positive {
    color: #4caf50;
    background-color: #e8f5e9;
  }

  &.negative {
    color: #f44336;
    background-color: #ffebee;
  }
`;

const ScoreProgressContainer = styled.div`
  margin: 20px 0;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ScoreProgressTitle = styled.div`
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 10px;
  color: #333;
`;

const ProgressBarContainer = styled.div`
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: visible;
  position: relative;
  margin: 10px 0;
  margin-top: 25px;
`;

const ProgressBar = styled.div`
  width: ${props => props.percentage}%;
  height: 100%;
  background-color: ${props => props.isOnTrack ? '#4CAF50' : '#2196F3'};
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 10px;
`;

const TargetMarker = styled.div`
  position: absolute;
  left: ${props => props.position}%;
  top: -25px;
  transform: translateX(-50%);
  color: #666;
  font-size: 1.2em;
  font-weight: bold;
`;

const ScoreProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
`;

const ScoreProgressDetails = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
  text-align: center;
  padding: 5px;
  background-color: #f8f8f8;
  border-radius: 4px;
`;

const HabitInsight = ({ habitData, habitName }) => {
  const [selectedHabit, setSelectedHabit] = useState(habitName);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[new Date().getMonth()];
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  // 사용 가능한 월 목록
  const availableMonths = useMemo(() => {
    return Object.keys(habitData || {}).sort((a, b) => {
      return monthNames.indexOf(a) - monthNames.indexOf(b);
    });
  }, [habitData]);

  // 한글 월 이름
  const getMonthNameKR = (monthName) => {
    const monthsKR = {
      'January': '1월', 'February': '2월', 'March': '3월', 'April': '4월',
      'May': '5월', 'June': '6월', 'July': '7월', 'August': '8월',
      'September': '9월', 'October': '10월', 'November': '11월', 'December': '12월'
    };
    return monthsKR[monthName] || monthName;
  };

  // 습관 목록 생성
  const habits = useMemo(() => {
    if (!habitData) return [];
    
    const habitsSet = new Set();
    
    Object.values(habitData).forEach(monthData => {
      if (Array.isArray(monthData)) {
        monthData.forEach(habit => {
          if (habit?.title) {
            habitsSet.add(habit.title);
          }
        });
      }
    });

    return Array.from(habitsSet);
  }, [habitData]);

  // 특정 월의 데이터 가져오기
  const getMonthData = (month) => {
    if (!habitData || !month) return null;
    
    if (!habitData[month]) return null;

    if (Array.isArray(habitData[month])) {
      const found = habitData[month].find(habit => habit.title === selectedHabit);
      return found;
    }
    return null;
  };

  // 통계 계산
  const stats = useMemo(() => {
    const monthData = getMonthData(selectedMonth);
    if (!monthData || !monthData.days) return null;

    // 현재 연속 달성 계산 (월을 넘어가도 연속으로 처리)
    const calculateCurrentStreak = () => {
      let streak = 0;
      let foundEnd = false;

      // 현재 날짜 구하기
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      
      // 현재 시점부터 역순으로 검사
      let monthIndex = currentMonth;
      let checkingDay = currentDay - 2; // 어제부터 시작
      
      console.log('=== 연속 달성일 계산 시작 ===');
      console.log(`현재 날짜: ${currentDay}일, ${monthNames[currentMonth]}`);

      // 오늘의 데이터 확인
      const todayData = getMonthData(monthNames[currentMonth]);
      const hasTodayRecord = todayData && todayData.days && todayData.days[currentDay - 1] > 0;
      
      while (monthIndex >= 0 && !foundEnd) {
        const monthData = getMonthData(monthNames[monthIndex]);
        console.log(`검사 중인 월: ${monthNames[monthIndex]}`);
        
        if (!monthData || !monthData.days) {
          console.log(`${monthNames[monthIndex]} 데이터 없음`);
          foundEnd = true;
          continue;
        }

        const days = monthData.days;
        
        // 현재 월 처리
        if (monthIndex === currentMonth) {
          console.log(`현재 월 검사 중: ${checkingDay}일부터`);
          for (let i = checkingDay; i >= 0; i--) {
            console.log(`${i + 1}일: ${days[i] > 0 ? '달성' : '미달성'}`);
            if (days[i] > 0) {
              streak++;
            } else {
              foundEnd = true;
              break;
            }
          }
        } else {
          // 이전 월 처리
          console.log(`이전 월 검사 중: ${days.length}일부터`);
          for (let i = days.length - 1; i >= 0; i--) {
            console.log(`${i + 1}일: ${days[i] > 0 ? '달성' : '미달성'}`);
            if (days[i] > 0) {
              streak++;
            } else {
              foundEnd = true;
              break;
            }
          }
        }

        if (!foundEnd) {
          monthIndex--;
          checkingDay = 30; // 이전 월로 넘어갈 때는 월말부터 검사
        }
      }

      // 오늘 기록이 있으면 streak에 1 추가
      if (hasTodayRecord) {
        streak++;
      }

      console.log(`최종 연속 달성일: ${streak}일 (오늘 기록: ${hasTodayRecord ? '있음' : '없음'})`);
      return streak;
    };

    // 달성률과 총점 계산
    const calculateAchievementStats = (data, startDate, endDate) => {
      if (!data || !data.days) return { rate: 0, days: 0, total: 0 };
      
      // 현재 날짜 정보 가져오기
      const today = new Date();
      const currentWeek = Math.ceil(today.getDate() / 7);
      
      // 주간 점수 계산
      const calculateWeeklyScore = () => {
        const today = new Date();
        const firstDayOfWeek = today.getDate() - today.getDay(); // 이번 주의 시작일
        const lastDayOfWeek = Math.min(firstDayOfWeek + 6, data.days.length - 1); // 이번 주의 마지막일
        
        console.log(`주간 점수 계산: ${firstDayOfWeek + 1}일 ~ ${lastDayOfWeek + 1}일`);
        
        const weeklyTotal = data.days
          .slice(firstDayOfWeek, lastDayOfWeek + 1)
          .reduce((sum, day) => sum + (day || 0), 0);
        
        return weeklyTotal;
      };

      // 시작일과 종료일이 유효한지 확인
      const start = Math.max(0, startDate - 1); // 0-based index로 변환
      const end = Math.min(data.days.length, endDate);
      
      // 계산할 날짜 수
      const daysToCount = end - start;
      if (daysToCount <= 0) return { rate: 0, days: 0, total: 0 };
      
      // 달성한 날짜와 총점 계산
      const completedDays = data.days.slice(start, end).filter(day => day > 0).length;
      const totalScore = data.days.slice(start, end).reduce((sum, day) => sum + (day || 0), 0);
      const weeklyScore = calculateWeeklyScore();
      
      // 달성률 계산
      const rate = ((completedDays / daysToCount) * 100).toFixed(1);
      
      return {
        rate,
        days: completedDays,
        total: totalScore,
        weeklyScore // 주간 점수 추가
      };
    };

    // 이전 달과의 달성률 변화 계산
    const calculateRateChange = () => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      
      // 선택된 월의 인덱스
      const selectedMonthIndex = monthNames.indexOf(selectedMonth);
      if (selectedMonthIndex === -1) return null;
      
      // 이전 월 데이터 가져오기
      const prevMonthIndex = selectedMonthIndex - 1;
      if (prevMonthIndex < 0) return null;
      
      const currentMonthData = getMonthData(selectedMonth);
      const prevMonthData = getMonthData(monthNames[prevMonthIndex]);
      
      if (!currentMonthData || !prevMonthData) return null;

      console.log('=== 달성률 증감 계산 시작 ===');
      
      // 비교 기준일 결정
      let compareDay;
      if (selectedMonthIndex === currentMonth) {
        // 현재 월인 경우 오늘까지
        compareDay = currentDay;
      } else {
        // 이전 월인 경우 해당 월의 마지막 날까지
        const lastDayOfMonth = new Date(today.getFullYear(), selectedMonthIndex + 1, 0).getDate();
        compareDay = lastDayOfMonth;
      }
      
      console.log(`비교 기준일: ${compareDay}일`);
      
      // 현재 월과 이전 월의 통계 계산
      const currentStats = calculateAchievementStats(currentMonthData, 1, compareDay);
      const prevStats = calculateAchievementStats(prevMonthData, 1, compareDay);
      
      // 이전 달의 전체 총점 계산 (프로그레스 바용)
      const prevFullMonthStats = calculateAchievementStats(prevMonthData, 1, prevMonthData.days.length);
      
      console.log(`현재 월: ${currentStats.days}일 달성, 총점 ${currentStats.total}점 (${currentStats.rate}%)`);
      console.log(`이전 월: ${prevStats.days}일 달성, 총점 ${prevStats.total}점 (${prevStats.rate}%)`);
      console.log(`이전 월 전체: 총점 ${prevFullMonthStats.total}점`);
      console.log(`달성률 변화: ${(currentStats.rate - prevStats.rate).toFixed(1)}%`);
      
      return {
        rateChange: (currentStats.rate - prevStats.rate).toFixed(1),
        current: {
          days: currentStats.days,
          total: currentStats.total,
          rate: currentStats.rate,
          weeklyScore: currentStats.weeklyScore  // 주간 점수 추가
        },
        prev: {
          days: prevStats.days,
          total: prevStats.total,
          rate: prevStats.rate,
          fullMonthTotal: prevFullMonthStats.total
        }
      };
    };

    // 최고 연속 달성 계산
    const calculateMaxStreak = () => {
      let maxStreak = 0;
      let currentStreak = 0;
      let maxStreakStart = null;
      let maxStreakEnd = null;
      let tempStart = null;

      console.log('=== 최고 연속 달성 계산 시작 ===');

      for (let monthIndex = 0; monthIndex < monthNames.length; monthIndex++) {
        const monthData = getMonthData(monthNames[monthIndex]);
        if (!monthData || !monthData.days) continue;

        console.log(`${monthNames[monthIndex]} 검사 중`);
        
        monthData.days.forEach((score, dayIndex) => {
          if (score > 0) {
            if (currentStreak === 0) {
              tempStart = { month: monthIndex, day: dayIndex + 1 };
            }
            currentStreak++;
            if (currentStreak > maxStreak) {
              maxStreak = currentStreak;
              maxStreakStart = tempStart;
              maxStreakEnd = { month: monthIndex, day: dayIndex + 1 };
              console.log(`새로운 최고 기록: ${maxStreak}일`);
            }
          } else {
            currentStreak = 0;
            tempStart = null;
          }
        });
      }

      // 날짜를 문자열로 변환
      const formatDate = (date) => {
        if (!date) return '';
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                       '7월', '8월', '9월', '10월', '11월', '12월'];
        return `${months[date.month]} ${date.day}일`;
      };

      console.log(`최종 최고 연속 달성: ${maxStreak}일`);
      if (maxStreakStart) {
        console.log(`기간: ${formatDate(maxStreakStart)} ~ ${formatDate(maxStreakEnd)}`);
      }

      return {
        streak: maxStreak,
        period: maxStreakStart ? `${formatDate(maxStreakStart)} ~ ${formatDate(maxStreakEnd)}` : ''
      };
    };

    const currentStreak = calculateCurrentStreak();
    const maxStreakInfo = calculateMaxStreak();
    const currentStats = calculateAchievementStats(
      monthData,
      1,
      new Date().getMonth() === monthNames.indexOf(selectedMonth) ? new Date().getDate() : 31
    );
    const rateChangeInfo = calculateRateChange();

    return {
      currentStreak,
      maxStreak: maxStreakInfo.streak,
      maxStreakPeriod: maxStreakInfo.period,
      achievementRate: currentStats.rate,
      rateChange: rateChangeInfo?.rateChange || null,
      rateChangeDetails: rateChangeInfo,
      hasPrevMonth: rateChangeInfo !== null
    };
  }, [habitData, selectedHabit, selectedMonth]);

  // 컴포넌트 초기화 시 기본 습관 설정
  React.useEffect(() => {
    if (habits.length > 0 && !habits.includes(selectedHabit)) {
      setSelectedHabit(habits[0]);
    }
  }, [habits, selectedHabit]);

  const ScoreProgress = ({ currentScore, prevScore }) => {
    // 현재 날짜 정보
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // 현재 날짜까지의 목표 위치 계산 (현재 날짜 / 이번 달 총 일수)
    const expectedPosition = (currentDay / daysInMonth) * 100;
    
    // 달성률 계산 (현재 점수 ÷ 목표 점수)
    const percentage = Math.min((currentScore / prevScore) * 100, 100);
    const isOnTrack = currentScore >= prevScore;

    return (
      <ScoreProgressContainer>
        <ScoreProgressTitle>
          {isOnTrack 
            ? `목표를 달성했습니다! 🎉`
            : `목표까지 ${prevScore - currentScore}점 남았습니다`
          }
        </ScoreProgressTitle>
        <ProgressBarContainer>
          <TargetMarker position={expectedPosition}>
            ↓
          </TargetMarker>
          <ProgressBar 
            percentage={percentage} 
            isOnTrack={isOnTrack}
          />
        </ProgressBarContainer>
        <ScoreProgressInfo>
          <span>이번 주 현재: {stats.rateChangeDetails?.current?.weeklyScore || 0}점</span>
          <span>이번 달 목표: {prevScore}점</span>
        </ScoreProgressInfo>
      </ScoreProgressContainer>
    );
  };

  if (!habitData) {
    return <ErrorMessage>데이터가 없습니다.</ErrorMessage>;
  }

  return (
    <HabitInsightContainer>
      <h3>상세 분석</h3>
      
      <Selectors>
        <SelectorBox>
          <Label>월 선택</Label>
          <SelectInput 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {getMonthNameKR(month)}
              </option>
            ))}
          </SelectInput>
        </SelectorBox>

        <SelectorBox>
          <Label>습관 선택</Label>
          <SelectInput 
            value={selectedHabit}
            onChange={(e) => setSelectedHabit(e.target.value)}
          >
            {habits.map(habit => (
              <option key={habit} value={habit}>{habit}</option>
            ))}
          </SelectInput>
        </SelectorBox>
      </Selectors>

      {stats ? (
        <>
          <StreakSection>
            <StreakBox className="current">
              <StreakTitle>현재 연속 달성</StreakTitle>
              <StreakNumber>{stats.currentStreak}일</StreakNumber>
            </StreakBox>
            <StreakBox>
              <StreakTitle>최고 연속 달성</StreakTitle>
              <StreakNumber>{stats.maxStreak}일</StreakNumber>
              {stats.maxStreakPeriod && (
                <StreakPeriod>{stats.maxStreakPeriod}</StreakPeriod>
              )}
            </StreakBox>
          </StreakSection>

          <AnalysisSection>
            <h4>{getMonthNameKR(selectedMonth)} 달성률</h4>
            <AchievementRate>
              {stats.achievementRate}%
              {stats.hasPrevMonth && (
                <RateChange className={stats.rateChange > 0 ? 'positive' : 'negative'}>
                  {stats.rateChange > 0 ? '▲' : '▼'} {Math.abs(stats.rateChange)}%
                </RateChange>
              )}
            </AchievementRate>
            {stats.rateChangeDetails && (
              <div>
                <h5>{`${getMonthNameKR(monthNames[monthNames.indexOf(selectedMonth) - 1])} 1일~${new Date().getDate()}일 vs ${getMonthNameKR(selectedMonth)} 1일~${new Date().getDate()}일`}</h5>
                <ScoreProgress 
                  currentScore={stats.rateChangeDetails.current.total}
                  prevScore={stats.rateChangeDetails.prev.fullMonthTotal}
                />
              </div>
            )}
          </AnalysisSection>
        </>
      ) : (
        <ErrorMessage>
          선택한 습관의 {getMonthNameKR(selectedMonth)} 데이터가 없습니다.
        </ErrorMessage>
      )}

      <TrendLine habitData={habitData} habitName={selectedHabit} />
    </HabitInsightContainer>
  );
};

export default HabitInsight;