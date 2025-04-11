import { calculatePriceGrowth } from "../services/landRegistryService";
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot, faBed, faBath, faRulerCombined, faClock, faBuilding, faHome,
  faMoneyBillWave, faChartLine, faExclamationTriangle, faSchool, faTrain,
  faChartBar, faDollarSign, faPercentage, faHistory, faArrowLeft, faEllipsisH,
  faQuestionCircle, faCar, faChartArea, faSterlingSign, // Use sterling
} from "@fortawesome/free-solid-svg-icons";

// --- Helper Functions ---

// Formats numbers as currency (adds £, commas) or returns "No result"
const formatPrice = (value) => {
    if (value === null || value === undefined || value === 'N/A' || value === 'No result') {
        return "No result";
    }
    // Check if it's already formatted
    if (typeof value === 'string' && value.startsWith('£')) {
        return value;
    }
    // Try to parse as number
    const num = parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
    if (!isNaN(num)) {
        return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // Use GB locale for formatting
    }
    // If it's a string that couldn't be parsed but isn't 'N/A', return it as is (less likely)
    if (typeof value === 'string') return value;
    return "No result";
};

// Formats percentages or returns "No result"
const formatPercentage = (value) => {
    if (value === null || value === undefined || value === 'N/A' || value === 'No result' || value === 'Not enough data' || value === 'Calculation error') {
        return "No result";
    }
    // Check if it already has %
    if (typeof value === 'string' && value.includes('%')) {
        // Clean up potential double percentage signs or extra text
        const match = value.match(/([+-]?\d+(\.\d+)?%)/);
        return match ? match[0] : value; // Return matched percentage or original string
    }
     // Assume it's a number needing formatting
     const num = parseFloat(value);
     if (!isNaN(num)) {
         return `${num.toFixed(1)}%`;
     }
    // If it's a string like 'p.a.' or similar, return it
    if (typeof value === 'string') return value;
    return "No result";
};

// Component to display a metric with "No result" state
const NoResultDisplay = ({ label, icon }) => (
    <div className="metric">
        {icon && <FontAwesomeIcon icon={icon} />}
        <div className="metric-content">
            <span className="metric-label">{label}</span>
            <span className="metric-value no-result">No result</span>
        </div>
    </div>
);

// --- Main Component ---

const PropertyDetail = ({
  property,
  // transactionData is now primarily derived from property.transactionHistory for search results
  onBackToListings,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!property) return null;

  // --- Data Preparation ---
  // Use transaction data from property if available (for search results)
  const currentTransactionData = property.transactionHistory || [];
  const hasTransactionData = currentTransactionData.length > 0;

  // Use pre-calculated growth info if available (from search), otherwise calculate
  const priceGrowthInfo = property.priceGrowth || calculatePriceGrowth(currentTransactionData);

  // Check if this represents a specific listing or an area summary
  const isSpecificListing = property.details && property.details.bedrooms !== 'N/A' && property.details.bedrooms !== undefined;
  const isAreaSummary = !isSpecificListing && hasTransactionData; // It's an area summary if not specific AND has transactions

  // Safely access nested properties
  const details = property.details || {};
  const price = property.price || {};
  const amenities = property.amenities || [];
  const transport = property.transport || [];
  const schools = property.schools || [];


  // --- Render Logic ---
  return (
    <div className="property-detail">
      {/* --- Header and Tabs --- */}
      <div className="detail-header">
        <button className="back-button" onClick={onBackToListings}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
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
          {/* Only show History tab if there's data */}
          {hasTransactionData && (
             <button
               className={activeTab === "history" ? "active" : ""}
               onClick={() => setActiveTab("history")}
             >
               History
             </button>
          )}
        </div>
      </div>

      {/* --- Image and Title --- */}
      <div className="property-image-large">
        <img src={property.image || 'https://placehold.co/600x400/e9e9e9/1d1d1d?text=Image+Not+Available'} alt={property.title || 'Property Image'} />
      </div>
      <div className="property-title-section">
        <h2>{property.title || 'Property Details'}</h2>
        <div className="property-location">
          <FontAwesomeIcon icon={faLocationDot} />
          <span>{property.location || 'Location not specified'}</span>
          {property.postcode && <span className="postcode"> ({property.postcode})</span>}
        </div>
      </div>

      {/* === Tab Content === */}

      {/* --- Overview Tab --- */}
      {activeTab === "overview" && (
        <div className="property-tab-content">
          {/* Property Specific Details (only for specific listings) */}
          {isSpecificListing && (
            <div className="detail-section">
              <h3>Property Details</h3>
              <div className="details-grid">
                <div className="metric">
                    <FontAwesomeIcon icon={faBed} /><div className="metric-content"><span className="metric-label">Bedrooms</span><span className="metric-value">{details.bedrooms || 'N/A'}</span></div>
                </div>
                 <div className="metric">
                    <FontAwesomeIcon icon={faBath} /><div className="metric-content"><span className="metric-label">Bathrooms</span><span className="metric-value">{details.bathrooms || 'N/A'}</span></div>
                 </div>
                 <div className="metric">
                    <FontAwesomeIcon icon={faRulerCombined} /><div className="metric-content"><span className="metric-label">Size</span><span className="metric-value">{details.sqft ? `${details.sqft} sqft` : 'N/A'}</span></div>
                 </div>
                 <div className="metric">
                    <FontAwesomeIcon icon={faClock} /><div className="metric-content"><span className="metric-label">Age</span><span className="metric-value">{details.age ? `${details.age} years` : 'N/A'}</span></div>
                 </div>
              </div>
            </div>
          )}

          {/* Pricing Information (Common to both types) */}
          <div className="detail-section">
            <h3>Pricing Information</h3>
            <div className="details-grid">
              <div className="metric">
                <FontAwesomeIcon icon={faSterlingSign} /><div className="metric-content"><span className="metric-label">Asking Price</span><span className="metric-value">{formatPrice(price.asking)}</span></div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faSterlingSign} /><div className="metric-content"><span className="metric-label">{isSpecificListing ? 'Est. Value' : 'Avg. Price (Area)'}</span><span className="metric-value">{formatPrice(price.estimated)}</span></div>
              </div>
              <div className="metric">
                 {/* ROI / Annualized Return depends on context and availability */}
                <FontAwesomeIcon icon={faChartLine} /><div className="metric-content"><span className="metric-label">{isSpecificListing ? 'Potential ROI' : 'Annualized Return'}</span><span className="metric-value">{formatPercentage(price.roi)}</span></div>
              </div>
              <div className="metric">
                <FontAwesomeIcon icon={faPercentage} /><div className="metric-content"><span className="metric-label">Rental Yield</span><span className="metric-value">{formatPercentage(price.rentalYield)}</span></div>
              </div>
            </div>
          </div>

          {/* Amenities, Transport, Schools (only for specific listings) */}
          {isSpecificListing && amenities.length > 0 && (
            <div className="detail-section">
              <h3>Amenities</h3>
              <ul className="amenities-list">
                {amenities.map((amenity, index) => (
                  <li key={index}><FontAwesomeIcon icon={amenity.toLowerCase().includes("park") ? faCar : faBuilding} /><span>{amenity}</span></li>
                ))}
              </ul>
            </div>
          )}
          {isSpecificListing && transport.length > 0 && (
            <div className="detail-section">
              <h3>Transport Links</h3>
              <ul className="transport-list">
                {transport.map((item, index) => (
                  <li key={index}><FontAwesomeIcon icon={faTrain} /><span>{item.name} ({item.distance})</span></li>
                ))}
              </ul>
            </div>
          )}
          {isSpecificListing && schools.length > 0 && (
             <div className="detail-section">
               <h3>Nearby Schools</h3>
               <ul className="schools-list">
                 {schools.map((school, index) => (
                   <li key={index}><FontAwesomeIcon icon={faSchool} /><span>{school}</span></li>
                 ))}
               </ul>
             </div>
           )}

           {/* Note for Area Summary */}
           {isAreaSummary && (
             <div className="detail-section area-summary-note">
                <p>This is an overview for the postcode area based on recent transaction data. Investment and historical data are available in the other tabs. Specific property details like bedrooms, amenities etc., require viewing individual listings.</p>
             </div>
           )}
        </div>
      )}

      {/* --- Investment Tab --- */}
      {activeTab === "investment" && (
        <div className="property-tab-content">
          {/* Placeholder for Market Trends */}
          <div className="detail-section">
             <h3>Market Trends (Placeholder) <FontAwesomeIcon icon={faEllipsisH} /></h3>
             <div className="market-trend-graph placeholder">
               <FontAwesomeIcon icon={faChartArea} size="3x" />
               <p>Detailed market trend visualization requires additional data integration.</p>
             </div>
          </div>

          {/* Investment Metrics */}
          <div className="detail-section">
            <h3>Investment Metrics</h3>
            <div className="details-grid">
                 {/* Home Value / Average Price */}
                <div className="metric">
                    <FontAwesomeIcon icon={faHome} />
                    <div className="metric-content">
                        <span className="metric-label">{isSpecificListing ? 'Est. Home Value' : 'Avg. Price (Area)'}</span>
                        <span className="metric-value">{formatPrice(price.estimated) || <span className="no-result">No result</span>}</span>
                    </div>
                </div>
                {/* Historical Growth (Calculated) */}
                 {priceGrowthInfo.growth !== 'No result' && priceGrowthInfo.growth !== 'Not enough data' && priceGrowthInfo.growth !== 'Calculation error' ? (
                     <div className="metric">
                        <FontAwesomeIcon icon={faChartLine} />
                        <div className="metric-content">
                           <span className="metric-label">Historical Growth</span>
                           <span className="metric-value">{priceGrowthInfo.growth}</span>
                        </div>
                     </div>
                 ) : (
                    <NoResultDisplay label="Historical Growth" icon={faChartLine} />
                 )}
                 {/* Annualized Return (Calculated) */}
                 {priceGrowthInfo.annualizedReturn !== 'No result' && priceGrowthInfo.annualizedReturn !== 'Not enough data' && priceGrowthInfo.annualizedReturn !== 'Calculation error' ? (
                     <div className="metric">
                        <FontAwesomeIcon icon={faPercentage} />
                        <div className="metric-content">
                           <span className="metric-label">Annualized Return</span>
                           <span className="metric-value">{formatPercentage(priceGrowthInfo.annualizedReturn)}</span>
                        </div>
                     </div>
                 ) : (
                    <NoResultDisplay label="Annualized Return" icon={faPercentage}/>
                 )}
                {/* Rental Yield (From Property Data) */}
                <div className="metric">
                    <FontAwesomeIcon icon={faPercentage} />
                    <div className="metric-content">
                       <span className="metric-label">Rental Yield</span>
                       <span className="metric-value">{formatPercentage(price.rentalYield)}</span>
                    </div>
                </div>
                 {/* Risk score (From Property Data - needs external source) */}
                <div className="metric">
                     <FontAwesomeIcon icon={faExclamationTriangle} />
                     <div className="metric-content">
                       <span className="metric-label">Risk Score</span>
                       <span className="metric-value">{property.riskScore && property.riskScore !== 'N/A' ? property.riskScore : <span className="no-result">No result</span>}</span>
                     </div>
                 </div>

                 {/* Placeholders for metrics needing external data */}
                 <NoResultDisplay label="Price Forecast" icon={faChartLine} />
                 <NoResultDisplay label="Rent Forecast" icon={faMoneyBillWave} />
                 <NoResultDisplay label="Market Liquidity" icon={faChartBar} />
            </div>
          </div>
        </div>
      )}

      {/* --- History Tab --- */}
      {activeTab === "history" && (
        <div className="property-tab-content">
          <div className="detail-section">
            <h3>
              Transaction History ({property.postcode}) <FontAwesomeIcon icon={faHistory} />
            </h3>
            {hasTransactionData ? (
              <>
                {/* --- Summary Stats --- */}
                <div className="price-stats history-stats">
                    {currentTransactionData.length > 0 && (
                         <div className="stat-item">
                            <span className="stat-label">Latest Recorded Sale ({currentTransactionData[0].date.toLocaleDateString()}):</span>
                            <span className="stat-value price-value">{formatPrice(currentTransactionData[0].price)}</span>
                         </div>
                    )}
                     {priceGrowthInfo.growth !== 'No result' && priceGrowthInfo.growth !== 'Not enough data' && priceGrowthInfo.growth !== 'Calculation error' && (
                         <div className="stat-item">
                           <span className="stat-label">Overall Growth Trend:</span>
                           <span className={`stat-value price-change ${priceGrowthInfo.growth.startsWith('+') ? 'positive' : 'negative'}`}>{priceGrowthInfo.growth}</span>
                         </div>
                     )}
                     {priceGrowthInfo.annualizedReturn !== 'No result' && priceGrowthInfo.annualizedReturn !== 'Not enough data' && priceGrowthInfo.annualizedReturn !== 'Calculation error' && (
                          <div className="stat-item">
                            <span className="stat-label">Annualized Return:</span>
                            <span className="stat-value price-change">{formatPercentage(priceGrowthInfo.annualizedReturn)}</span>
                          </div>
                     )}
                     {/* Display Price Range */}
                     {priceGrowthInfo.priceRange.min > 0 && (
                          <div className="stat-item">
                            <span className="stat-label">Price Range (in results):</span>
                            <span className="stat-value">{formatPrice(priceGrowthInfo.priceRange.min)} - {formatPrice(priceGrowthInfo.priceRange.max)}</span>
                          </div>
                     )}
                      <div className="stat-item">
                            <span className="stat-label">Total Transactions Found:</span>
                            <span className="stat-value">{currentTransactionData.length}</span>
                      </div>

                </div>

                {/* --- Transaction Table --- */}
                <div className="table-container">
                    <table className="transaction-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Price</th>
                          <th>Type</th>
                          <th>Address</th>
                          <th>New Build</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTransactionData.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{transaction.date ? transaction.date.toLocaleDateString() : 'N/A'}</td>
                            <td>{formatPrice(transaction.price)}</td>
                            <td>{transaction.propertyType || 'N/A'}</td>
                            <td>{transaction.address || 'N/A'}</td>
                            <td>{transaction.isNewBuild ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </>
            ) : (
              // Message if no transaction data was found
              <div className="no-data-message">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <p>No historical transaction data found for this specific property or area.</p>
                {!isSpecificListing && <p>Try searching another postcode.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Need to re-import calculatePriceGrowth if not globally available or passed down
// Assuming it's imported where PropertyDetail is used or available globally.
// If not, you might need to pass it as a prop or import it here:



export default PropertyDetail;