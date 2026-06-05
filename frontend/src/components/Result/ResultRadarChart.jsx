import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

export const ResultRadarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-light text-xs">
        No topic data available for visualization.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map((item) => ({
    subject: item.topic.length > 22 ? `${item.topic.substring(0, 20)}...` : item.topic,
    percentage: item.percentage,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-80 relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            axisLine={false}
          />
          <Radar
            name="Topic Performance"
            dataKey="percentage"
            stroke="#6366f1"
            fill="#818cf8"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResultRadarChart;
