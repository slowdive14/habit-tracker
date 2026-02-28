import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface YearlyExerciseCardProps {
  title: string;
  color: string;
  data: Array<{ month: string; value: number }>;
  yearlyTotal: number;
  yearlyAverage: number;
  bestMonth: { month: string; value: number };
  worstMonth: { month: string; value: number };
  unit: string;
  previousYearTotal?: number;
  yearOverYearChange?: number;
  trend: 'strong_increase' | 'increasing' | 'stable' | 'decreasing' | 'strong_decrease';
  trendPercentage?: number;
}

const YearlyExerciseCard: React.FC<YearlyExerciseCardProps> = ({
  title,
  color,
  data,
  yearlyTotal,
  yearlyAverage,
  bestMonth,
  worstMonth,
  unit,
  previousYearTotal,
  yearOverYearChange,
  trend,
  trendPercentage = 0
}) => {
  // 추세별 아이콘, 색상, 텍스트 정의
  const trendConfig = {
    strong_increase: {
      icon: TrendingUpIcon,
      color: '#2e7d32',  // 진한 녹색
      text: '강한 증가 추세',
      bgColor: 'rgba(46, 125, 50, 0.1)'
    },
    increasing: {
      icon: TrendingUpIcon,
      color: '#66bb6a',  // 밝은 녹색
      text: '증가 추세',
      bgColor: 'rgba(102, 187, 106, 0.1)'
    },
    stable: {
      icon: TrendingFlatIcon,
      color: '#9e9e9e',  // 회색
      text: '안정 추세',
      bgColor: 'rgba(158, 158, 158, 0.1)'
    },
    decreasing: {
      icon: TrendingDownIcon,
      color: '#ef5350',  // 밝은 빨강
      text: '감소 추세',
      bgColor: 'rgba(239, 83, 80, 0.1)'
    },
    strong_decrease: {
      icon: TrendingDownIcon,
      color: '#c62828',  // 진한 빨강
      text: '강한 감소 추세',
      bgColor: 'rgba(198, 40, 40, 0.1)'
    }
  };

  const currentTrend = trendConfig[trend];
  const TrendIcon = currentTrend.icon;
  const trendColor = currentTrend.color;
  const trendText = currentTrend.text;
  const trendBgColor = currentTrend.bgColor;

  return (
    <Card
      sx={{
        height: '100%',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent>
        {/* 헤더: 운동명 + 전년 대비 변화율 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
          {yearOverYearChange !== undefined && (
            <Chip
              icon={<TrendIcon />}
              label={`${yearOverYearChange > 0 ? '+' : ''}${yearOverYearChange}%`}
              size="small"
              sx={{
                backgroundColor: yearOverYearChange > 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: yearOverYearChange > 0 ? '#4caf50' : '#f44336',
                fontWeight: 600
              }}
            />
          )}
        </Box>

        {/* 주요 메트릭: 연간 총합 */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            color: color,
            mb: 1
          }}
        >
          {yearlyTotal.toLocaleString()}
          <Typography component="span" variant="h6" sx={{ ml: 1, color: 'text.secondary' }}>
            {unit}
          </Typography>
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          연간 총합
        </Typography>

        {/* 12개월 바 차트 */}
        <Box sx={{ width: '100%', height: { xs: 180, sm: 200 }, mb: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${color}`,
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
                formatter={(value: number) => [`${value} ${unit}`, title]}
              />
              <Bar
                dataKey="value"
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* 통계 칩들 */}
        <Stack spacing={1.5}>
          {/* 일일 평균 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`일일 평균: ${yearlyAverage} ${unit}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                fontWeight: 500,
                flex: 1
              }}
            />
          </Box>

          {/* 최고/최저 월 */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`최고: ${bestMonth.month} (${bestMonth.value} ${unit})`}
              size="small"
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                color: '#2e7d32',
                fontWeight: 500,
                flex: 1
              }}
            />
            {worstMonth.month !== '-' && (
              <Chip
                label={`최저: ${worstMonth.month} (${worstMonth.value} ${unit})`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  color: '#ef6c00',
                  fontWeight: 500,
                  flex: 1
                }}
              />
            )}
          </Box>

          {/* 추세 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<TrendIcon />}
              label={`${trendText} (${trendPercentage > 0 ? '+' : ''}${trendPercentage}%)`}
              size="small"
              sx={{
                backgroundColor: trendBgColor,
                color: trendColor,
                fontWeight: 500,
                flex: 1
              }}
            />
          </Box>

          {/* 전년 대비 (있을 경우) */}
          {previousYearTotal !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`전년 동기: ${previousYearTotal.toLocaleString()} ${unit}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  fontWeight: 500,
                  flex: 1
                }}
              />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default YearlyExerciseCard;
