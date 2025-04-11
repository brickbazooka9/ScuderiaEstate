// src/components/DemographicCard.js
import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faVenusMars,
  faBirthdayCake,
  faGlobeEurope,
  faClock,
  faHandshake,
  faHomeUser, // Demography
  faUsersRectangle,
  faFlag,
  faBookQuran,
  faLanguage, // Ethnic/Religion/Language
  faBriefcase,
  faClockFour,
  faIndustry,
  faUserTie,
  faCarSide, // Work/Travel
  faHouseChimneyWindow,
  faBuilding, // Housing
  faGraduationCap,
  faUserGraduate, // Education
  faHeartPulse,
  faQuestion, // Health/Other
} from "@fortawesome/free-solid-svg-icons";

import DemographicBarChart from "./DemographicBarChart"; // Import the new component

// Helper function to get an icon based on topic name (extend as needed)
const getTopicIcon = (topicName) => {
  const lowerTopic = topicName.toLowerCase();
  if (lowerTopic.includes("sex") && !lowerTopic.includes("sexual"))
    return faVenusMars;
  if (lowerTopic.includes("age")) return faBirthdayCake;
  if (lowerTopic.includes("birth")) return faGlobeEurope;
  if (lowerTopic.includes("residence")) return faClock;
  if (lowerTopic.includes("partner")) return faHandshake;
  if (lowerTopic.includes("household comp")) return faHomeUser;
  if (lowerTopic.includes("ethnic")) return faUsersRectangle;
  if (lowerTopic.includes("national")) return faFlag;
  if (lowerTopic.includes("religion")) return faBookQuran;
  if (lowerTopic.includes("language")) return faLanguage;
  if (lowerTopic.includes("economic") || lowerTopic.includes("activity"))
    return faBriefcase;
  if (lowerTopic.includes("hours")) return faClockFour;
  if (lowerTopic.includes("industry")) return faIndustry;
  if (lowerTopic.includes("occupation")) return faUserTie;
  if (lowerTopic.includes("travel")) return faCarSide;
  if (lowerTopic.includes("tenure")) return faHouseChimneyWindow;
  if (lowerTopic.includes("accommodation")) return faBuilding;
  if (lowerTopic.includes("qualification")) return faGraduationCap;
  if (lowerTopic.includes("student")) return faUserGraduate;
  if (lowerTopic.includes("health")) return faHeartPulse;
  if (lowerTopic.includes("sexual orientation")) return faQuestion; // Placeholder
  return faUsers; // Default
};

const DemographicCard = ({ topicName, nomisData, geoCodes }) => {
  if (!nomisData || nomisData.error) {
    return (
      <div className="demographic-card error">
        <div className="card-header">
          <FontAwesomeIcon
            icon={getTopicIcon(topicName)}
            className="topic-icon"
          />
          <h3>{topicName}</h3>
        </div>
        <div className="card-content no-data">
          <p>Data retrieval failed for this topic.</p>
          {nomisData?.error && <small>Error: {nomisData.error}</small>}
        </div>
      </div>
    );
  }

  if (!nomisData.obs || nomisData.obs.length === 0) {
    return (
      <div className="demographic-card no-data-card">
        <div className="card-header">
          <FontAwesomeIcon
            icon={getTopicIcon(topicName)}
            className="topic-icon"
          />
          <h3>{topicName}</h3>
        </div>
        <div className="card-content no-data">
          <p>No specific data available for LSOA/LAD level.</p>
        </div>
      </div>
    );
  }

  // --- Data Processing Logic ---
  const dimensionKey = Object.keys(nomisData.obs[0] || {}).find(
    (key) =>
      ![
        "dataset",
        "geography",
        "measures",
        "freq",
        "time_format",
        "unit",
        "time",
        "obs_value",
        "obs_status",
        "obs_conf",
        "obs_round",
        "urn",
      ].includes(key)
  );

  if (!dimensionKey) {
    console.warn(`Could not determine dimension key for topic: ${topicName}`);
    return (
      <div className="demographic-card error">
        <div className="card-header">
          <FontAwesomeIcon
            icon={getTopicIcon(topicName)}
            className="topic-icon"
          />
          <h3>{topicName}</h3>
        </div>
        <div className="card-content error-content">
          <p>Could not parse data structure for this topic.</p>
        </div>
      </div>
    );
  }

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
      ) // Exclude total category
      .map((obs) => ({
        label: obs[dimensionKey]?.description || "N/A",
        value: obs.obs_value?.value,
        percentage:
          totalValue > 0 && obs.obs_value?.value !== undefined
            ? (obs.obs_value.value / totalValue) * 100
            : 0,
      }));
  };

  const lsoaChartData = processLevelData(geoCodes?.lsoa_gss);
  const ladChartData = processLevelData(geoCodes?.lad_gss);
  const lsoaDescription = nomisData.obs.find(
    (obs) => obs.geography?.geogcode === geoCodes?.lsoa_gss
  )?.geography?.description;
  const ladDescription = nomisData.obs.find(
    (obs) => obs.geography?.geogcode === geoCodes?.lad_gss
  )?.geography?.description;

  return (
    <div className="demographic-card">
      <div className="card-header">
        <FontAwesomeIcon
          icon={getTopicIcon(topicName)}
          className="topic-icon"
        />
        <h3>{topicName}</h3>
      </div>
      <div className="card-content">
        {/* Display Charts */}
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
      </div>
    </div>
  );
};

DemographicCard.propTypes = {
  topicName: PropTypes.string.isRequired,
  nomisData: PropTypes.object, // Can be null or have error structure
  geoCodes: PropTypes.shape({
    lsoa_gss: PropTypes.string,
    lad_gss: PropTypes.string,
  }),
};

export default DemographicCard;
