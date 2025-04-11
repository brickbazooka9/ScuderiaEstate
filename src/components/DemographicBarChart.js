// src/components/DemographicBarChart.js
import React from 'react';
import PropTypes from 'prop-types'; // Optional, but good practice for defining prop types

const DemographicBarChart = ({ data, levelName, areaName, maxPercentage = 100 }) => {
    if (!data || data.length === 0) {
        return <p className="no-chart-data">No data available for {levelName}.</p>;
    }

    // Sort data by percentage, descending, for visual clarity
    const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

    return (
        <div className="demographic-bar-chart">
            <h5>{levelName} <span className="area-name">({areaName || 'N/A'})</span></h5>
            <ul className="chart-list">
                {sortedData.map((item, index) => {
                    // Ensure percentage is a valid number between 0 and maxPercentage
                    const percentage = Math.max(0, Math.min(item.percentage || 0, maxPercentage));
                    const barWidth = percentage > 0 ? (percentage / maxPercentage) * 100 : 0;

                    // Determine bar color (simple example, could be more sophisticated)
                    const barColor = `hsl(${200 + index * 15}, 70%, 50%)`; // Vary color slightly

                    return (
                        <li key={item.label || index} className="chart-item" title={`${item.label}: ${item.value?.toLocaleString() ?? 'N/A'} (${percentage.toFixed(1)}%)`}>
                            <div className="chart-label">{item.label}</div>
                            <div className="chart-bar-container">
                                <div
                                    className="chart-bar"
                                    style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                                ></div>
                            </div>
                            <div className="chart-percentage">{percentage.toFixed(1)}%</div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

// Optional: Define prop types for better development experience
DemographicBarChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.number,
        percentage: PropTypes.number.isRequired,
    })).isRequired,
    levelName: PropTypes.string.isRequired,
    areaName: PropTypes.string,
    maxPercentage: PropTypes.number,
};


export default DemographicBarChart;