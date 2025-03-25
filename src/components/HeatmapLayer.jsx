import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

const HeatmapLayer = ({
  data,
  radius = 25,
  blur = 15,
  gradient = { 0.4: "blue", 0.6: "lime", 0.8: "yellow", 1.0: "red" },
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !data || !data.length) return;

    // Create heat layer
    const heat = L.heatLayer(data, {
      radius,
      blur,
      gradient,
    }).addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeLayer(heat);
    };
  }, [map, data, radius, blur, gradient]);

  return null;
};

export default HeatmapLayer;
