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
  // 데이터 유효성 검사
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>데이터가 충분하지 않습니다</p>
      </div>
    );
  }

  // 데이터의 모든 값이 유효한지 확인
  const validData = data.every(item => 
    item && 
    typeof item.name === 'string' && 
    typeof item.value === 'number' && 
    !isNaN(item.value)
  );

  if (!validData) {
    return (
      <div style={{ width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>잘못된 데이터 형식입니다</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 200, marginTop: '1rem', marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>
        {habitName} 주간 트렌드
      </h3>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name"
            interval={0}
            tick={{ fontSize: 11 }}
            height={30}
            angle={-15}
            textAnchor="end"
            stroke="#999"
          />
          <YAxis
            domain={[0, 21]}
            ticks={[0, 7, 14, 21]}
            tickFormatter={(value) => `${value}점`}
            stroke="#999"
          />
          <Tooltip
            formatter={(value: any) => [`${value}점`, '주간 총점']}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={{ r: 3, strokeWidth: 1 }}
            activeDot={{ r: 5, strokeWidth: 1 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyTrend;