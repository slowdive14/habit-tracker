import { useState, useEffect } from 'react';
import { generateHabitInsights } from '../services/openai';

const useHabitInsights = (habitData, habitName) => {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        setLoading(true);
        setError(null);
        const newInsight = await generateHabitInsights(habitData, habitName);
        if (newInsight) {
          setInsight(newInsight);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching habit insights:', err);
      } finally {
        setLoading(false);
      }
    };

    // 하루에 한 번만 인사이트를 가져오도록 설정
    const lastFetch = localStorage.getItem(`lastInsightFetch_${habitName}`);
    const today = new Date().toDateString();
    
    if (!lastFetch || lastFetch !== today) {
      fetchInsight();
      localStorage.setItem(`lastInsightFetch_${habitName}`, today);
    }
  }, [habitData, habitName]);

  return { insight, loading, error };
};

export default useHabitInsights;
