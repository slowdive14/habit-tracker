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
        <LineChart data={validData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyTrend;