import React, { useState, useEffect } from 'react';
import { Box, Grid, Select, MenuItem, FormControl, InputLabel, Paper, Typography, Stack } from '@mui/material';
import { HeatMapGrid } from 'react-grid-heatmap';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface HabitStatsProps {
  habitData: any;
  selectedHabit: string;
  habitName: string;
  currentStreak: number;
  bestStreak: number;
  weeklyImprovement: number;
  totalDays: number;
  themeColor: string;
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
}) => {
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<Month>(MONTHS[new Date().getMonth()]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    if (habitData) {
      const years = Object.keys(habitData).sort();
      setAvailableYears(years);
      if (!years.includes(selectedYear)) {
        setSelectedYear(years[years.length - 1]);
      }
    }
  }, [habitData]);

  useEffect(() => {
    if (!habitData || !selectedYear || !selectedMonth) return;

    const monthData = habitData[selectedYear]?.[selectedMonth];
    if (!monthData) {
      setHeatmapData(Array(5).fill(Array(7).fill(0)));
      return;
    }

    // 선택된 습관의 데이터 찾기
    const habitIndex = monthData.findIndex((h: any) => 
      selectedHabit === 'All' ? h.id === 'exercise' : h.id === selectedHabit
    );

    if (habitIndex === -1) {
      setHeatmapData(Array(5).fill(Array(7).fill(0)));
      return;
    }

    const days = monthData[habitIndex]?.days || Array(31).fill(0);
    
    // 5x7 그리드로 변환
    const grid: number[][] = [];
    let dayIndex = 0;

    for (let week = 0; week < 5; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        weekData.push(dayIndex < days.length ? days[dayIndex] || 0 : 0);
        dayIndex++;
      }
      grid.push(weekData);
    }

    setHeatmapData(grid);
  }, [habitData, selectedYear, selectedMonth, selectedHabit]);

  const getColor = (value: number): string => {
    const maxValue = 5;
    const intensity = Math.min(value / maxValue, 1);
    return `rgba(0, 200, 0, ${intensity})`;
  };

  // 배지 조건 체크
  const badges = [
    { id: 'streak-7', condition: bestStreak >= 7, label: '7일 연속 달성' },
    { id: 'streak-30', condition: bestStreak >= 30, label: '30일 연속 달성' },
    { id: 'total-100', condition: totalDays >= 100, label: '100일 누적 달성' },
  ];

  const earnedBadges = badges.filter(badge => badge.condition);

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={6}>
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
        <Grid item xs={6}>
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

      <Box sx={{ width: '100%', height: '200px' }}>
        <HeatMapGrid
          data={heatmapData}
          xLabels={['일', '월', '화', '수', '목', '금', '토']}
          yLabels={['1주', '2주', '3주', '4주', '5주']}
          cellHeight="35px"
          cellRender={(_x: number, _y: number, value: number) => (
            <div title={`${value}점`}>
              {value > 0 ? value : ''}
            </div>
          )}
          cellStyle={(_x: number, _y: number, value: number) => ({
            background: getColor(value),
            fontSize: '12px',
            color: value > 2.5 ? '#fff' : '#000',
            border: '1px solid #fff'
          })}
        />
      </Box>

      <Paper elevation={3} sx={{ p: 2, mb: 2, borderTop: `4px solid ${themeColor}` }}>
        {/* 습관 이름 */}
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 2,
            fontWeight: 'bold',
            color: 'text.primary'
          }}
        >
          {habitName}
        </Typography>

        {/* 스트릭 정보 */}
        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              현재 연속
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h4">
                {currentStreak}
              </Typography>
              {currentStreak >= 3 && (
                <LocalFireDepartmentIcon sx={{ color: 'orange' }} />
              )}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              최고 기록
            </Typography>
            <Typography variant="h4">
              {bestStreak}
            </Typography>
          </Box>
        </Stack>

        {/* 주간 개선도 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            지난주 대비
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            {weeklyImprovement > 0 ? (
              <TrendingUpIcon sx={{ color: 'success.main' }} />
            ) : weeklyImprovement < 0 ? (
              <TrendingDownIcon sx={{ color: 'error.main' }} />
            ) : null}
            <Typography 
              variant="body1"
              color={weeklyImprovement > 0 ? 'success.main' : 'error.main'}
            >
              {Math.abs(weeklyImprovement)}%
            </Typography>
          </Stack>
        </Box>

        {/* 획득한 배지 */}
        {earnedBadges.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              획득한 배지
            </Typography>
            <Stack direction="row" spacing={1}>
              {earnedBadges.map(badge => (
                <Box
                  key={badge.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                  }}
                >
                  <EmojiEventsIcon sx={{ fontSize: 16, mr: 0.5, color: 'gold' }} />
                  <Typography variant="caption">
                    {badge.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default HabitStats;
