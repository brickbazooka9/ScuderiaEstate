import React, { useEffect, useState } from "react";
import "./LoadingScreen.css";

const LoadingScreen = ({
  isVisible,
  message = "Loading properties",
  progress = null,
  itemsFound = 0,
}) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prevDots) => {
        if (prevDots.length >= 3) return "";
        return prevDots + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-animation">
          <div className="spinner-container">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
        </div>

        <div className="loading-text">
          <h2>
            {message}
            {dots}
          </h2>
          {itemsFound > 0 && (
            <p className="properties-found">{itemsFound} properties found</p>
          )}

          {progress !== null && (
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{ width: `${Math.min(100, progress)}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
