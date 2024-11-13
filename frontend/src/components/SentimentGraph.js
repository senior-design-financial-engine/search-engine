// SentimentGraph.js
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';

// Register the required components with ChartJS
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);


function SentimentGraph() {
  const data = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
    datasets: [
      {
        label: 'Sentiment Score',
        data: [0.5, -0.2, 0.1, 0.3, 0.8],
        fill: false,
        borderColor: 'blue',
      },
    ],
  };

  return (
    <div style={{ width: '80%', margin: '50px auto' }}>
      <h2>Sentiment Analysis Over Time</h2>
      <Line data={data} />
    </div>
  );
}

export default SentimentGraph;
