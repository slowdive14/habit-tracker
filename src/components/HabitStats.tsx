import React, { useState, useEffect } from 'react';
import { Box, Grid, Select, MenuItem, FormControl, InputLabel, Paper, Typography, Stack } from '@mui/material';
import { HeatMapGrid } from 'react-grid-heatmap';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface HabitBase {
  id: string;
  title: string;
  name: string;
  color: string;
}

interface HabitStatsProps {
  habitData: any;
  selectedHabit: string;
  habitName: string;
  currentStreak: number;
  bestStreak: number;
  weeklyImprovement: number;
  totalDays: number;
  themeColor: string;
  habits: HabitBase[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

type Month = typeof MONTHS[number];

const monthsKR: Record<Month, string> = {
  'January': '1월',
  'February': '2월',
  'March': '3월',
  'April': '4월',
  'May': '5월',
  'June': '6월',
  'July': '7월',
  'August': '8월',
  'September': '9월',
  'October': '10월',
  'November': '11월',
  'December': '12월'
};

const HabitStats: React.FC<HabitStatsProps> = ({
  habitData,
  selectedHabit,
  habitName,
  currentStreak,
  bestStreak,
  weeklyImprovement,
  totalDays,
  themeColor,
  habits
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<Month>(MONTHS[new Date().getMonth()]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [habitHeatmaps, setHabitHeatmaps] = useState<Array<{
    id: string;
    title: string;
    data: number[][];
    color: string;
  }>>([]);

  // 연도 목록 업데이트
  useEffect(() => {
    if (habitData) {
      const years = Object.keys(habitData)
        .filter(key => !isNaN(Number(key)))
        .sort((a, b) => Number(b) - Number(a));
      
      setAvailableYears(years);
      if (!years.includes(selectedYear)) {
        setSelectedYear(years[0] || new Date().getFullYear().toString());
      }
    }
  }, [habitData]);

  // 모든 습관의 히트맵 데이터 계산
  useEffect(() => {
    if (!habitData || !selectedYear || !selectedMonth) return;

    const monthData = habitData[selectedYear]?.[selectedMonth];
    if (!monthData) {
      setHabitHeatmaps(habits.map(habit => ({
        ...habit,
        data: Array(5).fill(Array(7).fill(0))
      })));
      return;
    }

    const newHeatmaps = habits.map(habit => {
      const habitIndex = monthData.findIndex((h: any) => h.id === habit.id);
      if (habitIndex === -1) return { ...habit, data: Array(5).fill(Array(7).fill(0)) };

      const days = monthData[habitIndex]?.days || Array(31).fill(0);
      
      // 해당 월의 첫 날과 마지막 날 계산
      const firstDay = new Date(Number(selectedYear), MONTHS.indexOf(selectedMonth), 1);
      const lastDay = new Date(Number(selectedYear), MONTHS.indexOf(selectedMonth) + 1, 0);
      const totalDays = lastDay.getDate();

      // 6x7 그리드 초기화
      const grid: number[][] = Array(6).fill(0).map(() => Array(7).fill(-1));

      // 달력 채우기
      let currentDay = 1;
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          if (week === 0 && day < firstDay.getDay()) continue;
          if (currentDay > totalDays) continue;
          grid[week][day] = days[currentDay - 1] || 0;
          currentDay++;
        }
      }

      // 실제 사용된 주 수만큼 잘라내기
      const trimmedGrid = grid.filter(week => week.some(day => day !== -1));

      return {
        ...habit,
        data: trimmedGrid
      };
    });

    setHabitHeatmaps(newHeatmaps);
  }, [habitData, selectedYear, selectedMonth]);

  const getColor = (value: number, baseColor: string): string => {
    if (value === -1) return 'transparent';
    const maxValue = 3;
    const intensity = Math.min(value / maxValue, 1);
    // hex 색상을 RGB로 변환하여 투명도 적용
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(baseColor);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${intensity})`;
    }
    return baseColor;
  };

  // 배지 조건 체크
  const badges = [
    { id: 'streak-7', condition: bestStreak >= 7, label: '7일 연속 달성' },
    { id: 'streak-30', condition: bestStreak >= 30, label: '30일 연속 달성' },
    { id: 'total-100', condition: totalDays >= 100, label: '100일 누적 달성' },
  ];

  const earnedBadges = badges.filter(badge => badge.condition);

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      {/* 상단 연도/월 선택 */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>연도</InputLabel>
            <Select
              value={selectedYear}
              label="연도"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>{year}년</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>월</InputLabel>
            <Select
              value={selectedMonth}
              label="월"
              onChange={(e) => setSelectedMonth(e.target.value as Month)}
            >
              {MONTHS.map((month) => (
                <MenuItem key={month} value={month}>{monthsKR[month]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* 주요 습관 3개의 연속 기록 */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, color: 'text.primary' }}>
          주요 습관 현황
        </Typography>
        <Grid container spacing={3}>
          {habits.slice(0, 3).map((habit, index) => (
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
                        {currentStreak}
                      </Typography>
                      {currentStreak >= 3 && (
                        <LocalFireDepartmentIcon sx={{ color: 'orange', fontSize: '1.5rem' }} />
                      )}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      최고 기록
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {bestStreak}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 모든 습관의 히트맵 표시 */}
      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, color: 'text.primary' }}>
          월간 습관 기록
        </Typography>
        <Grid container spacing={3}>
          {habitHeatmaps.map((habit) => (
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
                    data={habit.data}
                    xLabels={['일', '월', '화', '수', '목', '금', '토']}
                    yLabels={Array(habit.data.length).fill(0).map((_, i) => `${i + 1}주`)}
                    cellHeight="22px"
                    cellRender={(_x: number, _y: number, value: number) => (
                      <div title={`${value}점`}>
                        {value > 0 ? value : ''}
                      </div>
                    )}
                    cellStyle={(_x: number, _y: number, value: number) => ({
                      background: getColor(value, habit.color),
                      fontSize: '11px',
                      color: value > 1.5 ? '#fff' : '#000',
                      border: value === -1 ? 'none' : '1px solid #fff',
                      borderRadius: '2px'
                    })}
                  />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default HabitStats;
