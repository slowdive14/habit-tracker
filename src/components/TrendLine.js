import React, { useState, useEffect } from 'react';
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

const TrendLine = ({ habitData }) => {
  const [selectedHabits, setSelectedHabits] = useState(new Set());
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!habitData) return;

    const monthlyTotals = {};
    const months = Object.keys(habitData);
    
    // 각 월의 모든 습관에 대한 총점 계산
    months.forEach(month => {
      const monthData = habitData[month];
      monthlyTotals[month] = {};
      
      console.log(`Processing month: ${month}`);
      console.log('Month data:', monthData);
      
      // 각 습관별로 총점 계산
      monthData.forEach(habit => {
        if (!habit.days || !habit.title) {
          console.log(`Skipping habit due to missing data:`, habit);
          return;
        }
        
        const total = habit.days.reduce((acc, score) => acc + (score || 0), 0);
        monthlyTotals[month][habit.title] = total;
        console.log(`${habit.title} total for ${month}: ${total}`);
      });
    });

    // 데이터 포맷 변환
    const data = months.sort((a, b) => {
      const monthOrder = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3,
        'May': 4, 'June': 5, 'July': 6, 'August': 7,
        'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      return monthOrder[a] - monthOrder[b];
    }).map(month => {
      const monthKR = {
        'January': '1월', 'February': '2월', 'March': '3월',
        'April': '4월', 'May': '5월', 'June': '6월',
        'July': '7월', 'August': '8월', 'September': '9월',
        'October': '10월', 'November': '11월', 'December': '12월'
      };
      
      const monthData = {
        month: monthKR[month],
        ...monthlyTotals[month]
      };
      
      console.log(`Formatted data for ${month}:`, monthData);
      return monthData;
    });

    console.log('Final chart data:', data);
    setChartData(data);
  }, [habitData]);

  const allHabits = chartData[0] ? Object.keys(chartData[0]).filter(key => key !== 'month') : [];
  const colors = {
    '운동': '#0072B2',          // Blue
    '영어 읽기': '#E69F00',     // Orange
    '독서': '#009E73',          // Green
    '아이들과 영어': '#D55E00', // Red
    '아내 마사지': '#CC79A7',   // Purple
    '코딩': '#56B4E9',          // Sky Blue
    '기상': '#F0E442',          // Yellow
    '산책': '#0072B2',          // Blue
    '요가': '#009E73',          // Green
    '공부': '#CC79A7'           // Purple
  };

  // 표시할 습관 필터링
  const displayHabits = allHabits.filter(habit => 
    selectedHabits.size === 0 || selectedHabits.has(habit)
  );

  const getHabitColor = (habit) => {
    return colors[habit] || '#808080'; // Default to gray if color not found
  };

  const toggleHabit = (habit) => {
    const newSelected = new Set(selectedHabits);
    if (newSelected.has(habit)) {
      newSelected.delete(habit);
    } else {
      newSelected.add(habit);
    }
    setSelectedHabits(newSelected);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
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
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>전체 기간 트렌드 (총점)</span>
        <div style={{ display: 'flex', gap: '8px' }}>
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
              dataKey="month" 
              stroke="#999"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#999"
              tickFormatter={(value) => `${value}점`}
              tick={{ fontSize: 12 }}
              label={{
                value: '총점',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '12px'
              }}
            />
            {displayHabits.map((habit) => (
              <Line
                key={habit}
                type="monotone"
                dataKey={habit}
                name={habit}
                stroke={getHabitColor(habit)}
                strokeWidth={1.5}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5, strokeWidth: 1 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendLine;