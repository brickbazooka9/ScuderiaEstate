// src/components/DemographicCard.js
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Topic Icons (keep existing imports)
    faUsers, faVenusMars, faBirthdayCake, faGlobeEurope, faClock, faHandshake, faHomeUser,
    faUsersRectangle, faFlag, faBookQuran, faLanguage,
    faBriefcase, faClockFour, faIndustry, faUserTie, faCarSide,
    faHouseChimneyWindow, faBuilding,
    faGraduationCap, faUserGraduate,
    faHeartPulse, faQuestion,
    // Collapse/Expand Icons
    faChevronDown,
    faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

import DemographicBarChart from './DemographicBarChart';

// Helper function to get an icon based on topic name
const getTopicIcon = (topicName) => {
    const lowerTopic = topicName.toLowerCase();
    if (lowerTopic.includes('sex') && !lowerTopic.includes('sexual')) return faVenusMars;
    if (lowerTopic.includes('age')) return faBirthdayCake;
    if (lowerTopic.includes('birth')) return faGlobeEurope;
    if (lowerTopic.includes('residence')) return faClock;
    if (lowerTopic.includes('partner')) return faHandshake;
    if (lowerTopic.includes('household comp')) return faHomeUser;
    if (lowerTopic.includes('ethnic')) return faUsersRectangle;
    if (lowerTopic.includes('national')) return faFlag;
    if (lowerTopic.includes('religion')) return faBookQuran;
    if (lowerTopic.includes('language')) return faLanguage;
    if (lowerTopic.includes('economic') || lowerTopic.includes('activity')) return faBriefcase;
    if (lowerTopic.includes('hours')) return faClockFour;
    if (lowerTopic.includes('industry')) return faIndustry;
    if (lowerTopic.includes('occupation')) return faUserTie;
    if (lowerTopic.includes('travel')) return faCarSide;
    if (lowerTopic.includes('tenure')) return faHouseChimneyWindow;
    if (lowerTopic.includes('accommodation')) return faBuilding;
    if (lowerTopic.includes('qualification')) return faGraduationCap;
    if (lowerTopic.includes('student')) return faUserGraduate;
    if (lowerTopic.includes('health')) return faHeartPulse;
    if (lowerTopic.includes('sexual orientation')) return faQuestion;
    return faUsers; // Default
};

const DemographicCard = ({
    topicName,
    nomisData,
    geoCodes,
    isCollapsed, // Receive collapsed state
    onToggleCollapse // Function to call when header is clicked
}) => {

    // Determine card state based on data/errors
    const hasError = !nomisData || nomisData.error;
    const hasData = nomisData && nomisData.obs && nomisData.obs.length > 0 && !hasError;
    const noSpecificData = !hasError && !hasData; // No error, but also no obs data

    // --- Data Processing Logic (only run if expanded and data exists) ---
    let lsoaChartData = [];
    let ladChartData = [];
    let lsoaDescription = null;
    let ladDescription = null;
    let dataParseError = false; // Flag for parsing issues

    if (!isCollapsed && hasData) {
        const dimensionKey = Object.keys(nomisData.obs[0] || {}).find(
            (key) =>
              ![
                "dataset", "geography", "measures", "freq", "time_format",
                "unit", "time", "obs_value", "obs_status", "obs_conf",
                "obs_round", "urn",
              ].includes(key)
        );

        if (dimensionKey) {
            // Helper function to process data for a specific geography level
            const processLevelData = (levelCode) => {
                if (!levelCode) return [];
                const levelData = nomisData.obs.filter(
                  (obs) => obs.geography?.geogcode === levelCode
                );
                if (levelData.length === 0) return [];

                const totalObs = levelData.find(
                  (obs) =>
                    obs[dimensionKey]?.value === 0 ||
                    obs[dimensionKey]?.description?.toLowerCase().includes("total")
                );
                const totalValue = totalObs?.obs_value?.value;

                return levelData
                  .filter(
                    (obs) =>
                      obs[dimensionKey]?.value !== 0 &&
                      !obs[dimensionKey]?.description?.toLowerCase().includes("total")
                  )
                  .map((obs) => ({
                    label: obs[dimensionKey]?.description || "N/A",
                    value: obs.obs_value?.value,
                    percentage:
                      totalValue > 0 && obs.obs_value?.value !== undefined
                        ? (obs.obs_value.value / totalValue) * 100
                        : 0,
                  }));
            };

            lsoaChartData = processLevelData(geoCodes?.lsoa_gss);
            ladChartData = processLevelData(geoCodes?.lad_gss);
            lsoaDescription = nomisData.obs.find(obs => obs.geography?.geogcode === geoCodes?.lsoa_gss)?.geography?.description;
            ladDescription = nomisData.obs.find(obs => obs.geography?.geogcode === geoCodes?.lad_gss)?.geography?.description;

        } else {
            console.warn(`Could not determine dimension key for topic: ${topicName}`);
            dataParseError = true; // Set flag if dimension key not found
        }
    }
    // --- End Data Processing Logic ---

    return (
        <div className={`demographic-card ${isCollapsed ? 'collapsed' : ''} ${hasError ? 'error' : ''} ${noSpecificData ? 'no-data-card' : ''}`}>
            {/* Make header clickable to toggle collapse state */}
            <div className="card-header clickable" onClick={onToggleCollapse}>
                <FontAwesomeIcon
                    icon={getTopicIcon(topicName)}
                    className="topic-icon"
                />
                <h3>{topicName}</h3>
                {/* Toggle Icon indicates state and clickability */}
                <FontAwesomeIcon
                    icon={isCollapsed ? faChevronDown : faChevronUp}
                    className="toggle-icon"
                    aria-hidden="true" // Hide decorative icon from screen readers
                />
            </div>

            {/* Conditionally render content based on collapsed state */}
            {!isCollapsed && (
                <div className="card-content">
                    {/* Handle Error State */}
                    {hasError && (
                        <div className="no-data">
                           <p>Data retrieval failed for this topic.</p>
                           {nomisData?.error && <small>Error: {nomisData.error}</small>}
                        </div>
                    )}
                    {/* Handle No Specific Data State */}
                    {noSpecificData && (
                         <div className="no-data">
                            <p>No specific data available for LSOA/LAD level.</p>
                         </div>
                    )}
                     {/* Handle Data Parsing Error State */}
                    {hasData && dataParseError && (
                         <div className="error-content">
                             <p>Could not parse data structure for this topic.</p>
                         </div>
                    )}
                    {/* Render Charts if data exists, processed correctly, and no errors */}
                    {hasData && !dataParseError && (
                        <>
                           <div className="chart-section">
                                <DemographicBarChart
                                    data={lsoaChartData}
                                    levelName="LSOA Level"
                                    areaName={lsoaDescription}
                                />
                           </div>
                           <div className="chart-section">
                                <DemographicBarChart
                                    data={ladChartData}
                                    levelName="Local Authority Level"
                                    areaName={ladDescription}
                                />
                           </div>
                        </>
                    )}
                </div>
            )}
        </div> // End demographic-card
    );
};

// Update PropTypes
DemographicCard.propTypes = {
  topicName: PropTypes.string.isRequired,
  nomisData: PropTypes.object,
  geoCodes: PropTypes.shape({
    lsoa_gss: PropTypes.string,
    lad_gss: PropTypes.string,
  }),
  isCollapsed: PropTypes.bool.isRequired, // Mark as required
  onToggleCollapse: PropTypes.func.isRequired, // Mark as required
};

export default DemographicCard;