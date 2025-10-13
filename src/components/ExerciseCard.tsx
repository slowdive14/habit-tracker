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

interface ExerciseCardProps {
  title: string;
  color: string;
  data: Array<{ date: string; value: number }>;
  currentValue: number;
  thisWeekAverage: number;
  lastWeekAverage: number;
  weeklyGoal?: number;
  totalThisWeek: number;
  unit: string;
  bestRecord: number;
  averageValue: number;
  todayRecommendation?: {
    weeklyGoal: number;
    completedThisWeek: number;
    remaining: number;
    remainingDays: number;
    progressRate: number;
    todayRecommendation: number;
  } | null;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  title,
  color,
  data,
  currentValue,
  thisWeekAverage,
  lastWeekAverage,
  weeklyGoal = 0,
  totalThisWeek,
  unit,
  bestRecord,
  averageValue,
  todayRecommendation
}) => {
  console.log('ExerciseCard rendered:', title);
  // 주간 추세 계산 (이번 주 평균 vs 지난 주 평균)
  const trend = thisWeekAverage - lastWeekAverage;
  const trendPercentage = lastWeekAverage > 0 ? ((trend / lastWeekAverage) * 100) : 0;
  
  // 목표 진행률 계산
  const progressPercentage = weeklyGoal > 0 ? Math.min((totalThisWeek / weeklyGoal) * 100, 100) : 0;
  
  // 차트 데이터 준비 - 적응형 스케일을 위해 최대값 계산
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
                  주간 추세 계산 방식 📈
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                  (이번 주 일평균 - 지난 주 일평균) / 지난 주 일평균 × 100%
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5 }}>
                  • 이번 주 일평균: 월요일~현재까지 총합 ÷ 경과일수
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5 }}>
                  • 지난 주 일평균: 지난 주 월~일 총합 ÷ 7일
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                  💡 지난 주 대비 이번 주 운동량 변화율 (더 안정적인 추세)
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

        {/* 이번 주 평균과 지난 주 평균 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {thisWeekAverage.toFixed(1)}
            <Typography component="span" variant="body1" sx={{ ml: 0.5, color: 'text.secondary' }}>
              {unit}/일
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            지난 주 평균: {lastWeekAverage.toFixed(1)}{unit}/일
          </Typography>
        </Box>

        {/* 미니 차트 */}
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

        {/* 주간 목표 진행률 */}
        {weeklyGoal > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  주간 목표
                </Typography>
                <Tooltip 
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        주간 목표 계산 방식 📊
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        일일 평균 × 7일 × 1.2배
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                        💡 현재 실력 기반으로 20% 도전적인 목표
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
                {totalThisWeek}/{weeklyGoal}{unit}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              color={getProgressColor()}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
            />
          </Box>
        )}

        {/* 오늘 권장량 */}
        {todayRecommendation && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              backgroundColor: todayRecommendation.progressRate >= 100
                ? 'rgba(46, 125, 50, 0.12)'
                : 'rgba(25, 118, 210, 0.08)',
              borderRadius: 2,
              border: `1px solid ${todayRecommendation.progressRate >= 100 ? '#2e7d32' : '#1976d2'}`,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
              📊 이번 주 진행 상황
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.primary' }}>
                목표: {todayRecommendation.weeklyGoal}{unit}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                완료: {todayRecommendation.completedThisWeek}{unit} ({todayRecommendation.progressRate}%)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.primary' }}>
                남은 일수: {todayRecommendation.remainingDays}일
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: todayRecommendation.progressRate >= 100 ? '#2e7d32' : '#1976d2'
                }}
              >
                {todayRecommendation.progressRate >= 100
                  ? '🎉 목표 달성!'
                  : `💪 오늘 권장: ${todayRecommendation.todayRecommendation}${unit}`
                }
              </Typography>
            </Box>
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
                  일일 평균 계산 방식 📊
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
              label={`평균 ${averageValue.toFixed(1)}${unit}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', cursor: 'help' }}
            />
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ExerciseCard;