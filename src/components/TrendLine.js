import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const TrendLine = ({ habitData, selectedYear }) => {
  const [selectedHabits, setSelectedHabits] = useState(new Set());
  const [chartData, setChartData] = useState([]);

  // 차트 데이터 처리
  useEffect(() => {
    if (!habitData || !habitData[selectedYear]) return;

    const yearData = habitData[selectedYear];
    const processedData = [];
    
    // 모든 월에 대해 데이터 처리
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // 각 월별 데이터 처리
    monthOrder.forEach(month => {
      const monthData = yearData[month];
      if (!monthData || !Array.isArray(monthData)) return;

      const monthStats = {
        monthKR: {
          'January': '1월', 'February': '2월', 'March': '3월',
          'April': '4월', 'May': '5월', 'June': '6월',
          'July': '7월', 'August': '8월', 'September': '9월',
          'October': '10월', 'November': '11월', 'December': '12월'
        }[month]
      };

      // 각 습관별 점수 계산
      monthData.forEach(habit => {
        if (habit?.days) {
          // 해당 월의 총점 계산
          const total = habit.days.reduce((sum, score) => sum + (score || 0), 0);
          monthStats[habit.title] = total;
        } else {
          monthStats[habit.title] = 0;
        }
      });

      processedData.push(monthStats);
    });

    setChartData(processedData);
  }, [habitData, selectedYear]);

  const allHabits = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return Object.keys(chartData[0]).filter(key => key !== 'monthKR');
  }, [chartData]);

  // 표시할 습관 목록
  const displayHabits = useMemo(() => {
    if (selectedHabits.size === 0) return allHabits;
    return allHabits.filter(habit => selectedHabits.has(habit));
  }, [selectedHabits, allHabits]);

  // 습관 토글
  const toggleHabit = (habit) => {
    const newSelectedHabits = new Set(selectedHabits);
    if (newSelectedHabits.has(habit)) {
      newSelectedHabits.delete(habit);
    } else {
      newSelectedHabits.add(habit);
    }
    setSelectedHabits(newSelectedHabits);
  };

  // 습관별 색상
  const getHabitColor = (habit) => {
    const colors = {
      '운동': '#0072B2',          // Blue
      '영어 읽기': '#E69F00',     // Orange
      '아이돌과 영어': '#009E73', // Green
      '독서': '#CC79A7',          // Pink
      '아내 마사지': '#D55E00'    // Red
    };
    return colors[habit] || '#666666';
  };

  // 툴팁 커스터마이징
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              color: entry.color,
              margin: '0'
            }}>
              {entry.name}: {entry.value}점
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      marginTop: '20px',
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* 습관 선택 버튼들 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {allHabits.map((habit) => (
            <button
              key={habit}
              onClick={() => toggleHabit(habit)}
              style={{
                padding: '4px 8px',
                border: `1px solid ${getHabitColor(habit)}`,
                borderRadius: '12px',
                backgroundColor: selectedHabits.has(habit) || selectedHabits.size === 0 
                  ? getHabitColor(habit)
                  : 'white',
                color: selectedHabits.has(habit) || selectedHabits.size === 0 
                  ? 'white' 
                  : getHabitColor(habit),
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s'
              }}
            >
              {habit}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="monthKR" 
              height={60}
              tick={{ fontSize: 14 }}
            />
            <YAxis 
              width={50}
              tick={{ fontSize: 14 }}
              tickFormatter={(value) => `${value}점`}
              label={{ 
                value: '습관 총점', 
                angle: -90, 
                position: 'insideLeft',
                offset: -5,
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {displayHabits.map((habit) => (
              <Line
                key={habit}
                type="monotone"
                dataKey={habit}
                stroke={getHabitColor(habit)}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendLine;