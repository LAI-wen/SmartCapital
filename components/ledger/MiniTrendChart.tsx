import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface ChartDataPoint {
  key: string;
  value: number;
}

interface MiniTrendChartProps {
  chartData: ChartDataPoint[];
  viewMode: 'month' | 'year';
}

const MiniTrendChart: React.FC<MiniTrendChartProps> = ({ chartData, viewMode }) => {
  const peakPoint: ChartDataPoint | null = chartData.reduce(
    (best: ChartDataPoint | null, d: ChartDataPoint) => (d.value > (best?.value ?? 0) ? d : best),
    null as ChartDataPoint | null
  );

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="text-xs font-bold font-serif text-ink-400">支出趨勢</h3>
        <div className="flex items-center gap-2">
          {peakPoint && peakPoint.value > 0 && (
            <span className="text-[10px] text-morandi-rose font-serif-num">
              最高 {viewMode === 'month' ? `${peakPoint.key}日` : peakPoint.key} ${peakPoint.value.toLocaleString()}
            </span>
          )}
          <span className="text-[10px] text-ink-300 font-serif">
            {viewMode === 'month' ? '每日' : '每月'}
          </span>
        </div>
      </div>
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C8A4A4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#C8A4A4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ stroke: '#C8A4A4', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && (payload[0].value as number) > 0) {
                  return (
                    <div className="bg-ink-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg font-serif-num">
                      <div className="text-white/60 text-[10px] mb-0.5">{label}</div>
                      <div>${(payload[0].value as number).toLocaleString()}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <XAxis dataKey="key" hide />
            <Area type="monotone" dataKey="value" stroke="#C8A4A4" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" dot={false} />
            {peakPoint && peakPoint.value > 0 && (
              <ReferenceDot x={peakPoint.key} y={peakPoint.value} r={4} fill="#C8A4A4" stroke="#fff" strokeWidth={2} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MiniTrendChart;
