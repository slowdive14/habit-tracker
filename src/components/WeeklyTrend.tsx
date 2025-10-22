import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeekData {
  name: string;
  value: number;
  trend?: number | null;
}

interface WeeklyTrendProps {
  data: WeekData[];
  habitName: string;
  color: string;
}

const WeeklyTrend: React.FC<WeeklyTrendProps> = ({
  data,
  habitName,
  color
}) => {
  // 데이터 유효성 검사 및 전처리
  const validData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(item => 
      item && 
      typeof item.name === 'string' && 
      typeof item.value === 'number' && 
      !isNaN(item.value)
    );
  }, [data]);

  // 추세선 계산
  const dataWithTrend = React.useMemo(() => {
    if (validData.length < 3) return validData; // 최소 3개 이상의 데이터 필요

    // 마지막 주차(현재 주)를 제외한 데이터로 추세선 계산
    const pastData = validData.slice(0, -1);

    // 선형 회귀 계산
    const n = pastData.length;
    const indices = pastData.map((_, i) => i);
    const values = pastData.map(d => d.value);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    // 기울기와 절편 계산
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 전체 데이터에 대해 추세값 계산
    return validData.map((item, index) => {
      // 현재 주차인 경우 추세선 값을 null로 설정
      const isCurrentWeek = index === validData.length - 1;

      return {
        ...item,
        trend: isCurrentWeek ? null : intercept + slope * index
      };
    });
  }, [validData]);

  // Y축 도메인 동적 계산
  const yAxisDomain = React.useMemo(() => {
    if (dataWithTrend.length === 0) return [0, 21];

    // 모든 값(실제 값과 추세선 값)에서 최대값 찾기
    const allValues = dataWithTrend.flatMap(item => [
      item.value,
      item.trend !== null && item.trend !== undefined ? item.trend : 0
    ]);

    const maxValue = Math.max(...allValues, 0);

    // 최대값이 21 이하면 21로 고정, 아니면 최대값의 1.1배로 설정
    const upperBound = maxValue <= 21 ? 21 : Math.ceil(maxValue * 1.1);

    return [0, upperBound];
  }, [dataWithTrend]);

  // 데이터가 없는 경우 처리
  if (validData.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: 200, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        color: '#666'
      }}>
        <p>데이터가 충분하지 않습니다</p>
      </div>
    );
  }

  // 차트 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>{label}</p>
          <p style={{ 
            color: payload[0].color,
            margin: '0'
          }}>
            {habitName}: {payload[0].value}점
          </p>
          {payload.length > 1 && payload[1].value !== null && (
            <p style={{ 
              color: `${color}80`, 
              margin: '0',
              fontStyle: 'italic'
            }}>
              추세: {payload[1].value.toFixed(1)}점
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 200 }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>
        {habitName} 주간 트렌드
      </h3>
      <ResponsiveContainer>
        <LineChart data={dataWithTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            height={50}
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
          />
          <YAxis
            width={30}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
            domain={yAxisDomain}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
          
          {/* 추세선 추가 */}
          {dataWithTrend.length > 1 && (
            <Line
              type="monotone"
              dataKey="trend"
              stroke={`${color}80`} // 반투명 색상
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name="추세선"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyTrend;