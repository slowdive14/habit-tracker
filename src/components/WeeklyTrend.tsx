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
    if (validData.length < 2) return validData;

    // 선형 회귀 계산
    const n = validData.length;
    const indices = validData.map((_, i) => i);
    const values = validData.map(d => d.value);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    // 기울기와 절편 계산
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 추세값 추가
    return validData.map((item, index) => ({
      ...item,
      trend: intercept + slope * index
    }));
  }, [validData]);

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
          {payload.length > 1 && (
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
            domain={[0, 21]}
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