import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardAllocationChartProps {
  allocationData: AllocationItem[];
  formatCurrency: (value: number, currency?: string, minimumFractionDigits?: number) => string;
}

const DashboardAllocationChart: React.FC<DashboardAllocationChartProps> = ({
  allocationData,
  formatCurrency,
}) => {
  return (
    <div className="w-32 h-32 relative shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={allocationData}
            innerRadius={40}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {allocationData.map((entry, index) => (
              <Cell key={`allocation-cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px 12px'
            }}
            formatter={(value: number) => formatCurrency(value)}
            itemStyle={{ color: '#4A4A4A', fontSize: '12px', fontWeight: 'bold' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] text-ink-400 font-serif">分布</span>
      </div>
    </div>
  );
};

export default DashboardAllocationChart;
