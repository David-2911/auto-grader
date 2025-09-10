import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataPoint } from '@/types';

interface LineChartComponentProps {
  data: ChartDataPoint[];
  xKey?: string;
  yKey?: string;
  title?: string;
  height?: number;
  color?: string;
}

export const LineChartComponent: React.FC<LineChartComponentProps> = ({
  data,
  xKey = 'name',
  yKey = 'value',
  title,
  height = 300,
  color = '#8884d8',
}) => {
  return (
    <div>
      {title && <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
