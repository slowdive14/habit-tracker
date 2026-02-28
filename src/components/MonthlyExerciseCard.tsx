import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Stack,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface MonthlyExerciseCardProps {
  title: string;
  color: string;
  data: Array<{ date: string; value: number }>;
  currentValue: number;
  lastMonthAverage: number;
  thisMonthAverage: number;
  monthlyGoal?: number;
  totalThisMonth: number;
  unit: string;
  bestRecord: number;
  averageValue: number;
}

const MonthlyExerciseCard: React.FC<MonthlyExerciseCardProps> = ({
  title,
  color,
  data,
  currentValue,
  lastMonthAverage,
  thisMonthAverage,
  monthlyGoal = 0,
  totalThisMonth,
  unit,
  bestRecord,
  averageValue
}) => {
  // 월간 추세 계산 (이번 달 평균 vs 지난 달 평균)
  const trend = thisMonthAverage - lastMonthAverage;
  const trendPercentage = lastMonthAverage > 0 ? ((trend / lastMonthAverage) * 100) : 0;
  
  // 목표 진행률 계산
  const progressPercentage = monthlyGoal > 0 ? Math.min((totalThisMonth / monthlyGoal) * 100, 100) : 0;

  // 예상 진행률 계산 (이번 달 경과일 / 이번 달 총 일수)
  const now = new Date();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedPercentage = (currentDay / totalDaysInMonth) * 100;
  
  // 차트 데이터 준비 - 적응형 스케일
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const yAxisDomain = [0, Math.ceil(maxValue * 1.1)];
  
  // 추세 아이콘 선택
  const getTrendIcon = () => {
    if (Math.abs(trendPercentage) < 5) return <TrendingFlatIcon fontSize="small" />;
    return trendPercentage > 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />;
  };
  
  // 추세 색상
  const getTrendColor = () => {
    if (Math.abs(trendPercentage) < 5) return 'text.secondary';
    return trendPercentage > 0 ? 'success.main' : 'error.main';
  };
  
  // 진행률 색상
  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'success';
    if (progressPercentage >= 70) return 'primary';
    if (progressPercentage >= 40) return 'warning';
    return 'error';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
    >
      <CardContent>
        {/* 헤더 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color, fontWeight: 600 }}>
            {title}
          </Typography>
          <Tooltip 
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  월간 추세 계산 방식 📊
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  (이번 달 평균 - 지난 달 평균) / 지난 달 평균 × 100%
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                  💡 월간 일일 평균 운동량 변화율
                </Typography>
              </Box>
            }
            arrow
            placement="top"
            enterTouchDelay={0}
            leaveTouchDelay={3000}
            disableHoverListener={false}
            disableTouchListener={false}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendColor(), cursor: 'help' }}>
              {getTrendIcon()}
              <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* 현재 값과 월간 비교 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title === '달리기' ? Math.round(thisMonthAverage) : thisMonthAverage.toFixed(1)}
            <Typography component="span" variant="body1" sx={{ ml: 0.5, color: 'text.secondary' }}>
              {unit}/일
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            지난 달: {title === '달리기' ? Math.round(lastMonthAverage) : lastMonthAverage.toFixed(1)}{unit}/일
          </Typography>
        </Box>

        {/* 30일 미니 차트 */}
        <Box sx={{ height: 60, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis domain={yAxisDomain} hide />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* 월간 목표 진행률 */}
        {monthlyGoal > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  월간 목표
                </Typography>
                <Tooltip 
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        월간 목표 계산 방식 📅
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        주간 목표 × 4.3주
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                        💡 한 달 전체 도전 목표
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                  enterTouchDelay={0}
                  leaveTouchDelay={3000}
                  disableHoverListener={false}
                  disableTouchListener={false}
                >
                  <IconButton size="small" sx={{ p: 0, opacity: 0.6 }}>
                    <HelpOutlineIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {title === '달리기' ? (Math.round(totalThisMonth * 10) / 10) : totalThisMonth}/{title === '달리기' ? Math.round(monthlyGoal) : monthlyGoal}{unit}
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.1)' }}>
              {/* 실제 진행률 바 */}
              <Box sx={{
                width: `${progressPercentage}%`,
                height: '100%',
                borderRadius: 3,
                backgroundColor: getProgressColor() === 'success' ? '#2e7d32'
                  : getProgressColor() === 'primary' ? '#1976d2'
                  : getProgressColor() === 'warning' ? '#ed6c02'
                  : '#d32f2f',
                transition: 'width 0.3s ease',
              }} />
              {/* 예상 진행률 마커 */}
              <Tooltip title={`예상 진행률: ${Math.round(expectedPercentage)}% (${currentDay}/${totalDaysInMonth}일)`} arrow placement="top">
                <Box sx={{
                  position: 'absolute',
                  left: `${expectedPercentage}%`,
                  top: -3,
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '5px solid rgba(0,0,0,0.45)',
                  cursor: 'help',
                }} />
              </Tooltip>
            </Box>
            {/* 앞서감/뒤처짐 표시 (실제 단위로) */}
            {monthlyGoal > 0 && (() => {
              const expectedAmount = Math.round((currentDay / totalDaysInMonth) * monthlyGoal);
              const diff = (title === '달리기' ? Math.round(totalThisMonth * 10) / 10 : totalThisMonth) - expectedAmount;
              return (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    display: 'block',
                    textAlign: 'right',
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    color: diff >= 0 ? '#2e7d32' : '#d32f2f',
                  }}
                >
                  {diff >= 0
                    ? `▲ 예상 대비 +${diff}${unit} 앞서감`
                    : `▼ 예상 대비 ${diff}${unit} 뒤처짐`
                  }
                </Typography>
              );
            })()}
          </Box>
        )}

        {/* 통계 칩들 */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={`최고 ${bestRecord}${unit}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          <Tooltip 
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  전체 평균 계산 방식 📊
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  전체 기간 총 운동량 ÷ 전체 경과 일수
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                  💡 운동하지 않은 날(0{unit})도 포함한 절대적 일일 평균
                </Typography>
              </Box>
            }
            arrow
            placement="top"
            enterTouchDelay={0}
            leaveTouchDelay={3000}
            disableHoverListener={false}
            disableTouchListener={false}
          >
            <Chip
              label={`전체 평균 ${title === '달리기' ? averageValue.toFixed(2) : averageValue.toFixed(1)}${unit}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', cursor: 'help' }}
            />
          </Tooltip>
          <Chip
            label={`이번 달 총 ${title === '달리기' ? (Math.round(totalThisMonth * 10) / 10) : totalThisMonth}${unit}`}
            size="small"
            variant="filled"
            sx={{ 
              fontSize: '0.7rem',
              backgroundColor: color + '20',
              color: color
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MonthlyExerciseCard;