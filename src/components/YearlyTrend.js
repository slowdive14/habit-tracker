import React from 'react';
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const YearlyTrend = ({ habitData, currentMonth, months, selectedHabit }) => {
  // 데이터 가공
  const processData = () => {
    return months.map((month) => {
      const monthData = habitData[month];
      if (!monthData) return { month };

      const result = { month };

      monthData.forEach(habit => {
        // 해당 월의 점수 합계 계산
        const sum = habit.days.reduce((acc, score) => {
          return acc + (score !== null && score !== undefined ? score : 0);
        }, 0);
        
        result[habit.name] = sum;
      });

      return result;
    });
  };

  const data = processData();
  const habits = habitData[months[0]] || [];

  // 선택된 습관에 따라 표시할 라인 결정
  const getLines = () => {
    if (selectedHabit === 'All') {
      return habits.map(habit => (
        <Line
          key={habit.name}
          type="monotone"
          dataKey={habit.name}
          name={habit.title}
          stroke={habit.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      ));
    } else {
      const habit = habits.find(h => h.name === selectedHabit);
      if (!habit) return null;
      return (
        <Line
          type="monotone"
          dataKey={habit.name}
          name={habit.title}
          stroke={habit.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      );
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: 1,
          boxShadow: 1,
          border: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}월</Typography>
        {payload.map((entry) => (
          <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                bgcolor: entry.color,
                borderRadius: '50%'
              }}
            />
            <Typography variant="body2">
              {entry.name}: {entry.value}점
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis
            dataKey="month"
            tickFormatter={(value) => `${value}월`}
            stroke="text.secondary"
          />
          <YAxis
            stroke="text.secondary"
            tickFormatter={(value) => `${value}점`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {getLines()}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default YearlyTrend;
