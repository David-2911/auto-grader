import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { Box, Typography, Paper, useTheme } from '@mui/material';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartProps {
  title?: string;
  data: any;
  options?: any;
  height?: number;
  showLegend?: boolean;
}

export const MetricsLineChart: React.FC<ChartProps> = ({ 
  title, 
  data, 
  options = {}, 
  height = 300,
  showLegend = true 
}) => {
  const theme = useTheme();

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: !!title,
        text: title,
        color: theme.palette.text.primary,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.palette.divider,
          borderColor: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        grid: {
          color: theme.palette.divider,
          borderColor: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 4,
        hoverRadius: 8,
      },
    },
    ...options,
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box height={height}>
        <Line data={data} options={defaultOptions} />
      </Box>
    </Paper>
  );
};

export const PerformanceBarChart: React.FC<ChartProps> = ({ 
  title, 
  data, 
  options = {}, 
  height = 300,
  showLegend = true 
}) => {
  const theme = useTheme();

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: !!title,
        text: title,
        color: theme.palette.text.primary,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.palette.divider,
          borderColor: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        grid: {
          color: theme.palette.divider,
          borderColor: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
        beginAtZero: true,
      },
    },
    ...options,
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box height={height}>
        <Bar data={data} options={defaultOptions} />
      </Box>
    </Paper>
  );
};

export const DistributionPieChart: React.FC<ChartProps> = ({ 
  title, 
  data, 
  options = {}, 
  height = 300,
  showLegend = true 
}) => {
  const theme = useTheme();

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'right' as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          padding: 15,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const meta = chart.getDatasetMeta(0);
                const style = meta.controller.getStyle(i);
                return {
                  text: `${label}: ${data.datasets[0].data[i]}`,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  pointStyle: 'circle',
                  hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        color: theme.palette.text.primary,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    ...options,
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      {title && (
        <Typography variant="h6" gutterBottom align="center">
          {title}
        </Typography>
      )}
      <Box height={height}>
        <Pie data={data} options={defaultOptions} />
      </Box>
    </Paper>
  );
};

export const SystemMetricsDoughnut: React.FC<ChartProps> = ({ 
  title, 
  data, 
  options = {}, 
  height = 250,
  showLegend = false 
}) => {
  const theme = useTheme();

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: showLegend,
      },
      title: {
        display: !!title,
        text: title,
        color: theme.palette.text.primary,
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    ...options,
  };

  return (
    <Box position="relative" height={height}>
      <Doughnut data={data} options={defaultOptions} />
      {/* Center text for metrics display */}
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        textAlign="center"
      >
        <Typography variant="h4" fontWeight="bold" color="primary">
          {data.datasets[0].data[0]}%
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {title}
        </Typography>
      </Box>
    </Box>
  );
};

export const RealTimeLineChart: React.FC<ChartProps & { 
  isRealTime?: boolean;
  updateInterval?: number;
}> = ({ 
  title, 
  data, 
  options = {}, 
  height = 300,
  showLegend = true,
  isRealTime = false
}) => {
  const theme = useTheme();

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isRealTime ? 750 : 1000,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: !!title,
        text: title,
        color: theme.palette.text.primary,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
          },
        },
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 2,
        hoverRadius: 6,
      },
    },
    ...options,
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2,
        ...(isRealTime && {
          borderLeft: `4px solid ${theme.palette.success.main}`,
        })
      }}
    >
      <Box height={height}>
        <Line data={data} options={defaultOptions} />
      </Box>
    </Paper>
  );
};
