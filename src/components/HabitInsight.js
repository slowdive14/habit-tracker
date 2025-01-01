import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import TrendLine from './TrendLine';

const HabitInsightContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 5px;
`;

const Selectors = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;

const SelectorBox = styled.div`
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-width: 150px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  color: #666;
  font-size: 0.9em;
  text-align: center;
`;

const SelectInput = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  color: #333;
  background: white;
  text-align: center;

  &:focus {
    outline: none;
    border-color: #2196f3;
  }
`;

const HabitInsight = ({ habitData }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // 사용 가능한 연도 목록 생성 (실제 데이터가 있는 연도만)
  const years = useMemo(() => {
    if (!habitData) return [];
    
    return Object.entries(habitData)
      .filter(([year, yearData]) => {
        // 해당 연도에 실제 데이터가 있는지 확인
        return Object.values(yearData).some(monthData => {
          if (!Array.isArray(monthData)) return false;
          return monthData.some(habit => 
            habit.days && habit.days.some(score => score > 0)
          );
        });
      })
      .map(([year]) => year)
      .sort((a, b) => b.localeCompare(a)); // 내림차순 정렬
  }, [habitData]);

  // 선택된 연도가 유효한지 확인하고, 아니라면 가장 최근 연도 선택
  React.useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  return (
    <HabitInsightContainer>
      <Selectors>
        <SelectorBox>
          <Label>연도 선택</Label>
          <SelectInput
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </SelectInput>
        </SelectorBox>
      </Selectors>

      {/* 연간 트렌드 라인 */}
      <div style={{ marginTop: '20px' }}>
        <TrendLine habitData={habitData} selectedYear={selectedYear} />
      </div>
    </HabitInsightContainer>
  );
};

export default HabitInsight;