import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faBed,
  faBath,
  faRulerCombined,
  faClock,
  faBuilding,
  faHome,
  faMoneyBillWave,
  faChartLine,
  faExclamationTriangle,
  faSchool,
  faTrain,
  faWalking,
  faChartBar,
  faDollarSign,
  faPercentage,
  faMapMarkedAlt,
  faHistory,
  faArrowLeft,
  faEllipsisH,
  faCar,
} from "@fortawesome/free-solid-svg-icons";

const PropertyDetail = ({
  property,
  transactionData = [],
  onBackToListings,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!property) return null;

  // Market trend data (would be real data in production)
  const marketTrendData = {
    labels: ["2022", "2023", "2024", "2025", "2026"],
    data: [850000, 875000, 920000, 950000, 980000],
  };

  // Use transaction data if available
  const hasTransactionData = transactionData && transactionData.length > 0;

  // Calculate price change if transaction data is available
  const calculatePriceChange = (data) => {
    if (!data || data.length < 2) return { value: 0, percentage: 0 };

    const oldestPrice = data[data.length - 1].price;
    const newestPrice = data[0].price;
    const change = newestPrice - oldestPrice;
    const percentage = (change / oldestPrice) * 100;

    return {
      value: change,
      percentage: percentage.toFixed(1),
    };
  };

  const priceChange = calculatePriceChange(transactionData);

  return (
    <div className="property-detail">
      <div className="detail-header">
        <button className="back-button" onClick={onBackToListings}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to listings
        </button>
        <div className="tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={activeTab === "investment" ? "active" : ""}
            onClick={() => setActiveTab("investment")}
          >
            Investment
          </button>
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
        </div>
      </div>

      <div className="property-image-large">
        <img src={property.image} alt={property.title} />
      </div>

      <div className="property-title-section">
        <h2>{property.title}</h2>
        <div className="property-location">
          <FontAwesomeIcon icon={faLocationDot} />
          <span>{property.location}</span>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="property-tab-content">
          <div className="detail-section">
            <h3>Property Details</h3>
            <div className="details-grid">
              <div className="metric">
                <FontAwesomeIcon icon={faBed} />
                <div className="metric-content">
                  <span className="metric-label">Bedrooms</span>
                  <span className="metric-value">
                    {property.details.bedrooms}
                  </span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faBath} />
                <div className="metric-content">
                  <span className="metric-label">Bathrooms</span>
                  <span className="metric-value">
                    {property.details.bathrooms}
                  </span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faRulerCombined} />
                <div className="metric-content">
                  <span className="metric-label">Size</span>
                  <span className="metric-value">
                    {property.details.sqft} sqft
                  </span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faClock} />
                <div className="metric-content">
                  <span className="metric-label">Age</span>
                  <span className="metric-value">
                    {property.details.age} years
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Pricing Information</h3>
            <div className="details-grid">
              <div className="metric">
                <FontAwesomeIcon icon={faDollarSign} />
                <div className="metric-content">
                  <span className="metric-label">Asking Price</span>
                  <span className="metric-value">{property.price.asking}</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faDollarSign} />
                <div className="metric-content">
                  <span className="metric-label">AI Estimated Value</span>
                  <span className="metric-value">
                    {property.price.estimated}
                  </span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faChartLine} />
                <div className="metric-content">
                  <span className="metric-label">Potential ROI</span>
                  <span className="metric-value">{property.price.roi}</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faPercentage} />
                <div className="metric-content">
                  <span className="metric-label">Rental Yield</span>
                  <span className="metric-value">
                    {property.price.rentalYield}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div className="detail-section">
              <h3>Amenities</h3>
              <ul className="amenities-list">
                {property.amenities.map((amenity, index) => (
                  <li key={index}>
                    <FontAwesomeIcon
                      icon={
                        amenity.toLowerCase().includes("gym") ||
                        amenity.toLowerCase().includes("fitness")
                          ? faBuilding
                          : amenity.toLowerCase().includes("parking") ||
                            amenity.toLowerCase().includes("garage")
                          ? faCar
                          : faBuilding
                      }
                    />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {property.transport && property.transport.length > 0 && (
            <div className="detail-section">
              <h3>Transport Links</h3>
              <ul className="transport-list">
                {property.transport.map((item, index) => (
                  <li key={index}>
                    <FontAwesomeIcon icon={faTrain} />
                    <span>
                      {item.name} ({item.distance})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {property.schools && property.schools.length > 0 && (
            <div className="detail-section">
              <h3>Nearby Schools</h3>
              <ul className="schools-list">
                {property.schools.map((school, index) => (
                  <li key={index}>
                    <FontAwesomeIcon icon={faSchool} />
                    <span>{school}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "investment" && (
        <div className="property-tab-content">
          <div className="detail-section">
            <h3>
              Market Trends <FontAwesomeIcon icon={faEllipsisH} />
            </h3>
            <div className="market-trend-graph">
              <svg width="100%" height="150" viewBox="0 0 500 150">
                <polyline
                  fill="none"
                  stroke="#1e88e5"
                  strokeWidth="3"
                  points={marketTrendData.labels
                    .map((_, i) => {
                      const x =
                        (i / (marketTrendData.labels.length - 1)) * 480 + 10;
                      // Create a wave-like pattern
                      const normalizedValue =
                        (marketTrendData.data[i] -
                          Math.min(...marketTrendData.data)) /
                        (Math.max(...marketTrendData.data) -
                          Math.min(...marketTrendData.data));
                      const y = 140 - normalizedValue * 100;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
                {marketTrendData.labels.map((label, i) => {
                  const x =
                    (i / (marketTrendData.labels.length - 1)) * 480 + 10;
                  return (
                    <text
                      key={i}
                      x={x}
                      y="140"
                      textAnchor="middle"
                      fontSize="12"
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="detail-section">
            <h3>Investment Metrics</h3>
            <div className="details-grid">
              <div className="metric">
                <FontAwesomeIcon icon={faHome} />
                <div className="metric-content">
                  <span className="metric-label">Home Value</span>
                  <span className="metric-value">£1,050,000</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faChartLine} />
                <div className="metric-content">
                  <span className="metric-label">Price Forecast</span>
                  <span className="metric-value">5.8% annual growth</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faMoneyBillWave} />
                <div className="metric-content">
                  <span className="metric-label">Rent Forecast</span>
                  <span className="metric-value">6.2% annual growth</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <div className="metric-content">
                  <span className="metric-label">Risk Score</span>
                  <span className="metric-value">{property.riskScore}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Property Insights</h3>
            <div className="details-grid">
              <div className="metric">
                <FontAwesomeIcon icon={faChartLine} />
                <div className="metric-content">
                  <span className="metric-label">Price Predictions</span>
                  <span className="metric-value">£600K (+5%)</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faPercentage} />
                <div className="metric-content">
                  <span className="metric-label">Rental Yield</span>
                  <span className="metric-value">
                    {property.price.rentalYield}
                  </span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faChartBar} />
                <div className="metric-content">
                  <span className="metric-label">Market Liquidity</span>
                  <span className="metric-value">High (Stable)</span>
                </div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <div className="metric-content">
                  <span className="metric-label">Risk Assessment</span>
                  <span className="metric-value">Low Risk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="property-tab-content">
          <div className="detail-section">
            <h3>
              Transaction History <FontAwesomeIcon icon={faHistory} />
            </h3>
            {!hasTransactionData ? (
              <div className="no-data-message">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <p>No transaction data available for this property.</p>
                <p>Try searching by the postcode to see transaction history.</p>
              </div>
            ) : (
              <>
                <div className="price-stats">
                  <div className="price-big">
                    <span className="price-value">
                      £{Math.round(transactionData[0].price / 1000)}K
                    </span>
                    {priceChange.percentage > 0 ? (
                      <span className="price-change positive">
                        +{priceChange.percentage}%
                      </span>
                    ) : (
                      <span className="price-change negative">
                        {priceChange.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Price</th>
                      <th>Property Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionData.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.date.toLocaleDateString()}</td>
                        <td>£{transaction.price.toLocaleString()}</td>
                        <td>{transaction.propertyType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
