import React from 'react';

const ResultsChart = ({ results, onClose, contextName }) => {
  if (!results || results.length === 0) {
    return null;
  }

  const isLungCancer = contextName && contextName.includes('Lung Cancer');

  // A more visually appealing color palette
  const colors = [
    '#4A90E2', '#50E3C2', '#F5A623', '#F8E71C', '#BD10E0', '#9013FE', 
    '#417505', '#D0021B', '#B8E986', '#7ED321', '#4A4A4A', '#9B9B9B'
  ];

  const getChartData = (field) => {
    const counts = results.reduce((acc, result) => {
      let value;
      if (isLungCancer) {
        value = result.prediction?.detected ? 'Cancer Indicators Detected' : 'No Indicators';
      } else {
        value = field === 'topPrediction' ? result.topPrediction?.label : result.metadata?.[field];
      }
      
      value = value || 'N/A';

      if (value !== 'N/A') {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {});

    const labels = Object.keys(counts);
    const data = Object.values(counts);
    return { labels, data };
  };

  const renderChart = (title, chartData) => {
    if (!chartData || chartData.labels.length === 0) {
      return null;
    }

    const { labels, data } = chartData;
    const maxValue = Math.max(...data, 0);
    const chartHeight = 220;
    const chartWidth = '100%'; // Make it responsive
    const barPadding = 0.4;

    return (
      <div className="chart-card">
        <h4 className="chart-title">{title}</h4>
        <div className="chart-container">
          <svg width={chartWidth} height={chartHeight} viewBox={`0 0 500 ${chartHeight}`}>
            {/* Y-axis lines and labels */}
            {[...Array(5)].map((_, i) => {
              const yPos = (chartHeight - 40) * i / 4 + 10;
              const value = Math.ceil(maxValue * (4 - i) / 4);
              return (
                <g key={i}>
                  <line x1="30" y1={yPos} x2="500" y2={yPos} stroke="#e2e8f0" strokeWidth="1" />
                  <text x="25" y={yPos} textAnchor="end" dy="0.3em" fontSize="10" fill="#718096">
                    {value}
                  </text>
                </g>
              );
            })}

            {data.map((value, index) => {
              const barHeight = value > 0 ? (value / (maxValue > 0 ? maxValue : 1)) * (chartHeight - 50) : 0;
              const x = (500 - 30) / data.length * (index + barPadding / 2) + 30;
              const width = (500 - 30) / data.length * (1 - barPadding);

              return (
                <g key={index} className="chart-bar-group">
                  <title>{`${labels[index]}: ${value}`}</title>
                  <rect
                    x={x}
                    y={chartHeight - 30 - barHeight}
                    width={width}
                    height={barHeight}
                    fill={colors[index % colors.length]}
                    rx="3"
                  />
                  <text
                    x={x + width / 2}
                    y={chartHeight - 25}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#4a5568"
                    dy="0.5em"
                  >
                    {labels[index]}
                  </text>
                  <text
                    x={x + width / 2}
                    y={chartHeight - 35 - barHeight}
                    textAnchor="middle"
                    fill="#1a202c"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const renderLungCancerCharts = () => (
    <div className="charts-grid">
      {renderChart('Detection Summary', getChartData())}
    </div>
  );

  const renderSkinDiseaseCharts = () => (
    <div className="charts-grid">
      {renderChart('Prediction Distribution', getChartData('topPrediction'))}
      {renderChart('Age Distribution', getChartData('age'))}
      {renderChart('Gender Distribution', getChartData('gender'))}
      {renderChart('Ethnicity Distribution', getChartData('race'))}
      {renderChart('Skin Tone Distribution', getChartData('skinColor'))}
      {renderChart('Skin Type Distribution', getChartData('skinType'))}
    </div>
  );

  return (
    <div className="results-chart-popup">
      <div className="results-chart-content">
        <div className="results-chart-header">
          <h3>{contextName} Visualization</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        {isLungCancer ? renderLungCancerCharts() : renderSkinDiseaseCharts()}
      </div>
    </div>
  );
};

export default ResultsChart;