import React from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface HabitStatsProps {
  habitName: string;
  currentStreak: number;
  bestStreak: number;
  weeklyImprovement: number;
  totalDays: number;
  themeColor: string;
}

const HabitStats: React.FC<HabitStatsProps> = ({
  habitName,
  currentStreak,
  bestStreak,
  weeklyImprovement,
  totalDays,
  themeColor,
}) => {
  // 배지 조건 체크
  const badges = [
    { id: 'streak-7', condition: bestStreak >= 7, label: '7일 연속 달성' },
    { id: 'streak-30', condition: bestStreak >= 30, label: '30일 연속 달성' },
    { id: 'total-100', condition: totalDays >= 100, label: '100일 누적 달성' },
  ];

  const earnedBadges = badges.filter(badge => badge.condition);

  return (
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
  );
};

export default HabitStats;
