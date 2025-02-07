import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HabitBase {
  id: string;
  title: string;
  name: string;
  color: string;
}

interface HabitInsightProps {
  habitData: any;
  habits: HabitBase[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const HabitInsight: React.FC<HabitInsightProps> = ({ habitData, habits }) => {
  useEffect(() => {
    console.log('HabitInsight mounted with data:', habitData);
    console.log('Habits:', habits);
  }, [habitData, habits]);

  // 월별 평균 점수 계산
  const calculateMonthlyAverages = () => {
    const monthlyData = MONTHS.map(month => {
      const result: any = { month };
      
      // 2025년 데이터 가져오기
      const monthHabits = habitData['2025']?.[month];
      if (!monthHabits) {
        habits.forEach(habit => {
          result[habit.id] = 0;
        });
        return result;
      }

      // 각 습관별 데이터 처리
      habits.forEach(habit => {
        // 해당 습관의 데이터 찾기
        const habitData = monthHabits.find((h: any) => h.id === habit.id);
        
        if (habitData?.days) {
          // 유효한 점수만 필터링 (0 포함)
          const scores = habitData.days.filter((score: number) => 
            typeof score === 'number'
          );
          
          // 평균 계산
          const sum = scores.reduce((acc: number, score: number) => acc + score, 0);
          const average = scores.length > 0 ? sum / scores.length : 0;
          
          // 건강 상태(등결림, 식도염)의 경우 점수를 반전
          const isHealthStatus = habit.id === 'back-pain' || habit.id === 'esophagitis' || habit.id === 'stool-condition';
          result[habit.id] = Number(isHealthStatus ? (3 - average).toFixed(1) : average.toFixed(1));
        } else {
          result[habit.id] = 0;
        }
      });

      return result;
    });

    return monthlyData;
  };

  const data = calculateMonthlyAverages();

  // 건강 상태의 경우 점수를 반전시켜 표시 (3점 -> 0점, 0점 -> 3점)
  const getCustomizedDot = (props: any) => {
    const { cx, cy, stroke, dataKey } = props;
    const habit = habits.find(h => h.id === dataKey);
    const isHealthStatus = habit?.id === 'back-pain' || 
                         habit?.id === 'esophagitis' || 
                         habit?.id === 'stool-condition' || 
                         false;

    if (!isHealthStatus) {
      return <circle cx={cx} cy={cy} r={4} fill={stroke} />;
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={stroke} />
        <circle cx={cx} cy={cy} r={2} fill="white" />
      </g>
    );
  };

  return (
    <Box>
      {/* 모든 습관 트렌드 */}
      <Box sx={{ width: '100%', height: 400, mb: 6 }}>
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis domain={[0, 3]} />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const habit = habits.find(h => h.id === name);
                const isHealthStatus = habit?.id === 'back-pain' || 
                                    habit?.id === 'esophagitis' || 
                                    habit?.id === 'stool-condition' || 
                                    false;
                return [
                  isHealthStatus ? `${value} (${value === 0 ? '나쁨' : value === 3 ? '좋음' : '중간'})` : value,
                  habit?.title || name
                ];
              }}
            />
            <Legend formatter={(value) => {
              const habit = habits.find(h => h.id === value);
              return habit?.title || value;
            }} />
            {habits.map(habit => (
              <Line
                key={habit.id}
                type="monotone"
                dataKey={habit.id}
                name={habit.title}
                stroke={habit.color}
                dot={getCustomizedDot}
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* 건강 상태 전용 트렌드 */}
      <Box sx={{ width: '100%', height: 400 }}>
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis 
              domain={[0, 3]}
              tickFormatter={(value) => {
                switch(value) {
                  case 0: return '나쁨';
                  case 1: return '약간 나쁨';
                  case 2: return '양호';
                  case 3: return '좋음';
                  default: return '';
                }
              }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const habit = habits.find(h => h.id === name);
                const isHealthStatus = habit?.id === 'back-pain' || 
                                    habit?.id === 'esophagitis' || 
                                    habit?.id === 'stool-condition' || 
                                    false;
                return [
                  isHealthStatus ? `${value} (${value === 0 ? '나쁨' : value === 3 ? '좋음' : '중간'})` : value,
                  habit?.title || name
                ];
              }}
            />
            <Legend formatter={(value) => {
              const habit = habits.find(h => h.id === value);
              return habit?.title || value;
            }} />
            {habits
              .filter(habit => ['back-pain', 'esophagitis', 'stool-condition'].includes(habit.id))
              .map(habit => (
                <Line
                  key={habit.id}
                  type="monotone"
                  dataKey={habit.id}
                  name={habit.title}
                  stroke={habit.color}
                  dot={getCustomizedDot}
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default HabitInsight; 