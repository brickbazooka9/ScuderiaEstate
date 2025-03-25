import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faBed,
  faBath,
  faRulerCombined,
  faClock,
  faBuilding,
  faDumbbell,
  faUser,
  faCar,
  faTrain,
  faSchool,
  faExclamationTriangle,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

const PropertyCard = ({ property, onViewProperty }) => {
  return (
    <div className="property-card">
      <div className="property-image">
        <img src={property.image} alt={property.title} />
      </div>
      <div className="property-content">
        <h3 className="property-title">{property.title}</h3>
        <div className="property-location">
          <FontAwesomeIcon icon={faLocationDot} />
          <span>{property.location}</span>
        </div>

        <div className="property-details">
          <div className="detail-item">
            <FontAwesomeIcon icon={faBed} />
            <span>{property.details.bedrooms} Bedrooms</span>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faBath} />
            <span>{property.details.bathrooms} Bathrooms</span>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faRulerCombined} />
            <span>{property.details.sqft} sqft</span>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faClock} />
            <span>{property.details.age} years old</span>
          </div>
        </div>

        <div className="property-pricing">
          <div className="price-row">
            <span className="price-label">Asking Price:</span>
            <span className="price-value">{property.price.asking}</span>
          </div>
          <div className="price-row">
            <span className="price-label">AI Estimated Value:</span>
            <span className="price-value">{property.price.estimated}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Potential ROI:</span>
            <span className="price-value">{property.price.roi}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Rental Yield:</span>
            <span className="price-value">{property.price.rentalYield}</span>
          </div>
        </div>

        <div className="property-sections">
          <div className="section">
            <h4>
              <FontAwesomeIcon icon={faBuilding} />
              <span>Amenities</span>
            </h4>
            <ul>
              {property.amenities.map((amenity, index) => (
                <li key={index}>
                  <FontAwesomeIcon
                    icon={
                      amenity === "Gym" || amenity === "Fitness Center"
                        ? faDumbbell
                        : amenity === "Concierge" || amenity === "Doorman"
                        ? faUser
                        : faCar
                    }
                  />
                  <span>{amenity}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="section">
            <h4>
              <FontAwesomeIcon icon={faTrain} />
              <span>Transport Links</span>
            </h4>
            <ul>
              {property.transport.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.name} ({item.distance})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="section">
            <h4>
              <FontAwesomeIcon icon={faSchool} />
              <span>Schools</span>
            </h4>
            <ul>
              {property.schools.map((school, index) => (
                <li key={index}>
                  <span>{school}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="property-footer">
          <div className="risk-score">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>Risk Score: {property.riskScore}</span>
          </div>
          <div className="rental-yield">
            <FontAwesomeIcon icon={faChartLine} />
            <span>Rental Yield: {property.price.rentalYield}</span>
          </div>
          <button className="view-property-btn" onClick={onViewProperty}>
            View Property
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
