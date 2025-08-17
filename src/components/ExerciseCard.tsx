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
  previousValue: number;
  weeklyGoal?: number;
  totalThisWeek: number;
  unit: string;
  bestRecord: number;
  averageValue: number;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  title,
  color,
  data,
  currentValue,
  previousValue,
  weeklyGoal = 0,
  totalThisWeek,
  unit,
  bestRecord,
  averageValue
}) => {
  console.log('ExerciseCard rendered:', title);
  // 추세 계산
  const trend = currentValue - previousValue;
  const trendPercentage = previousValue > 0 ? ((trend / previousValue) * 100) : 0;
  
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
                  추세 계산 방식 📈
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  (오늘 - 어제) / 어제 × 100%
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                  💡 전날 대비 운동량 변화율
                </Typography>
              </Box>
            }
            arrow
            placement="top"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendColor(), cursor: 'help' }}>
              {getTrendIcon()}
              <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* 현재 값과 이전 값 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {currentValue}
            <Typography component="span" variant="body1" sx={{ ml: 0.5, color: 'text.secondary' }}>
              {unit}
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            이전: {previousValue}{unit}
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

        {/* 통계 칩들 */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={`최고 ${bestRecord}${unit}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip
            label={`평균 ${averageValue.toFixed(1)}${unit}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ExerciseCard;