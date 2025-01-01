import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const habits = [
  { name: 'Exercise', color: '#0072B2' },  // Blue
  { name: 'English Reading', color: '#E69F00' },  // Orange
  { name: 'Reading', color: '#009E73' },  // Green
  { name: 'English with kids', color: '#D55E00' },  // Red
  { name: 'Wife Massage', color: '#CC79A7' },  // Purple
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const initialHabitData = (() => {
  const currentYear = new Date().getFullYear().toString();
  return {
    [currentYear]: months.reduce((acc, month) => {
      acc[month] = habits.map(habit => ({ 
        ...habit, 
        days: Array(new Date(currentYear, months.indexOf(month) + 1, 0).getDate()).fill(0) 
      }));
      return acc;
    }, {})
  };
})();

const HabitTracker = ({ saveHabitData, loadHabitData }) => {
  const currentMonthName = months[new Date().getMonth()];
  const [currentMonth, setCurrentMonth] = useState(currentMonthName);
  const [habitData, setHabitData] = useState(initialHabitData);
  const [activeHabit, setActiveHabit] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState('All');

  useEffect(() => {
    const loadUserData = async () => {
      const data = await loadHabitData();
      if (data) {
        setHabitData(data);
      }
    };

    loadUserData();
  }, [loadHabitData]);

  const handleScoreChange = (habitIndex, dayIndex, score) => {
    const currentYear = new Date().getFullYear().toString();
    const newHabitData = {
      ...habitData,
      [currentYear]: {
        ...habitData[currentYear],
        [currentMonth]: habitData[currentYear][currentMonth].map((habit, index) =>
          index === habitIndex
            ? { ...habit, days: habit.days.map((day, idx) => idx === dayIndex ? score : day) }
            : habit
        )
      }
    };

    setHabitData(newHabitData);
    if (typeof saveHabitData === 'function') {
      saveHabitData(newHabitData);
    } else {
      console.error('saveHabitData is not a function');
    }
  };

  const handleReset = () => {
    const currentYear = new Date().getFullYear().toString();
    const newHabitData = {
      ...habitData,
      [currentYear]: {
        ...habitData[currentYear],
        [currentMonth]: habits.map(habit => ({ 
          ...habit, 
          days: Array(new Date(currentYear, months.indexOf(currentMonth) + 1, 0).getDate()).fill(0) 
        }))
      }
    };

    setHabitData(newHabitData);
    if (typeof saveHabitData === 'function') {
      saveHabitData(newHabitData);
    } else {
      console.error('saveHabitData is not a function');
    }
  };

  const getWeekNumber = (date) => {
    const day = date.getDay();
    const nearestThursday = new Date(date);
    nearestThursday.setDate(date.getDate() + 4 - (day === 0 ? 7 : day));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((nearestThursday - yearStart) / 86400000) + 1) / 7);
  };

  const getWeekRange = (date) => {
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [monday, sunday];
  };

  const weeklyData = useMemo(() => {
    const data = [];
    const currentYear = new Date().getFullYear().toString();
    const daysInMonth = new Date(currentYear, months.indexOf(currentMonth) + 1, 0).getDate();
    let currentDay = new Date(currentYear, months.indexOf(currentMonth), 1);

    while (currentDay.getMonth() === months.indexOf(currentMonth)) {
      const weekNumber = getWeekNumber(currentDay);
      const [monday, sunday] = getWeekRange(currentDay);

      const weekData = {
        name: `Week ${weekNumber} (${monday.getDate()}/${monday.getMonth() + 1}-${sunday.getDate()}/${sunday.getMonth() + 1})`
      };

      habits.forEach((habit, index) => {
        const weekTotal = habitData[currentYear][currentMonth][index].days.slice(
          monday.getDate() - 1, Math.min(sunday.getDate(), daysInMonth)
        ).reduce((sum, day) => sum + day, 0);
        weekData[habit.name] = weekTotal;
      });

      data.push(weekData);
      currentDay.setDate(currentDay.getDate() + 7);
    }

    return data;
  }, [currentMonth, habitData]);

  const yearlyData = useMemo(() => {
    return Object.keys(habitData).map(year => {
      return months.map(month => {
        const monthlyData = habitData[year][month];
        return {
          name: month,
          ...habits.reduce((acc, habit, index) => {
            const monthlyTotal = monthlyData[index].days.reduce((sum, day) => sum + day, 0);
            acc[habit.name] = monthlyTotal;
            return acc;
          }, {})
        };
      });
    }).flat();
  }, [habitData]);

  const handleMonthChange = (e) => {
    setCurrentMonth(e.target.value);
  };

  const handleMouseEnter = (habitName) => {
    setActiveHabit(habitName);
  };

  const handleMouseLeave = () => {
    setActiveHabit(null);
  };

  const handleHabitSelect = (e) => {
    setSelectedHabit(e.target.value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Advanced Habit Tracker - {currentMonth} {new Date().getFullYear()}</h1>
      <div className="flex mb-4">
        <select onChange={handleMonthChange} value={currentMonth} className="mb-4 p-2 border rounded">
          {months.map(month => <option key={month} value={month}>{month}</option>)}
        </select>
        <button onClick={handleReset} className="ml-4 p-2 bg-red-500 text-white rounded">Reset Data</button>
      </div>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="border p-2">Habit</th>
              {[...Array(new Date().getDate())].map((_, i) => (
                <th key={i + 1} className={`border p-2 ${new Date().getDate() === i + 1 && new Date().getMonth() === months.indexOf(currentMonth) ? 'bg-yellow-200' : ''}`}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habitData[new Date().getFullYear().toString()][currentMonth].map((habit, habitIndex) => (
              <tr key={habitIndex}>
                <td className="border p-2 font-bold">{habit.name}</td>
                {habit.days.map((score, dayIndex) => (
                  <td key={dayIndex} className={`border p-2 ${new Date().getDate() === dayIndex + 1 && new Date().getMonth() === months.indexOf(currentMonth) ? 'bg-yellow-200' : ''}`}>
                    <select
                      value={score}
                      onChange={(e) => handleScoreChange(habitIndex, dayIndex, parseInt(e.target.value))}
                      className="w-16 p-1 border rounded"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-4">
        <select onChange={handleHabitSelect} value={selectedHabit} className="p-2 border rounded">
          <option value="All">All Habits</option>
          {habits.map(habit => <option key={habit.name} value={habit.name}>{habit.name}</option>)}
        </select>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Weekly Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {(selectedHabit === 'All' ? habits : habits.filter(habit => habit.name === selectedHabit)).map((habit, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={habit.name}
                stroke={habit.color}
                strokeOpacity={activeHabit === habit.name || !activeHabit ? 1 : 0.1}
                onMouseEnter={() => handleMouseEnter(habit.name)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Yearly Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {(selectedHabit === 'All' ? habits : habits.filter(habit => habit.name === selectedHabit)).map((habit, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={habit.name}
                stroke={habit.color}
                strokeOpacity={activeHabit === habit.name || !activeHabit ? 1 : 0.1}
                onMouseEnter={() => handleMouseEnter(habit.name)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HabitTracker;
