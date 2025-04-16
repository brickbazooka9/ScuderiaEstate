import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Import L for default icon fix

import HeatmapLayer from "./components/HeatmapLayer";
import PropertyCard from "./components/PropertyCard";
import PropertyDetail from "./components/PropertyDetail";
import LoadingScreen from "./components/LoadingScreen";
import {
  fetchPropertyDataByPostcode,
  formatTransactionData,
  calculatePriceGrowth,
} from "./services/landRegistryService";
import { fetchDemographicData } from "./services/demographicsService";
// import { fetchScrapedListings } from "./services/listingsService";

// Fix default Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// --- Geocoding Function ---
const getCoordinatesFromPostcode = async (postcode) => {
  if (!postcode || typeof postcode !== "string") {
    console.error("Invalid postcode provided for geocoding:", postcode);
    return null;
  }
  const formattedPostcode = encodeURIComponent(postcode.trim().toUpperCase());
  const apiUrl = `https://nominatim.openstreetmap.org/search?postalcode=${formattedPostcode}&countrycodes=gb&format=json&limit=1&addressdetails=1`;

  try {
    console.log(`Geocoding postcode: ${postcode} using URL: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(
        `Geocoding API error: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    console.log("Geocoding response:", data);
    if (data && data.length > 0) {
      const { lat, lon, address } = data[0];
      const town =
        address?.city ||
        address?.town ||
        address?.village ||
        address?.county ||
        address?.state ||
        null;
      return { lat: parseFloat(lat), lng: parseFloat(lon), town: town };
    } else {
      console.warn(`No coordinates found for postcode: ${postcode}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

// --- MapController Component ---
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (
      center &&
      Array.isArray(center) &&
      center.length === 2 &&
      !isNaN(center[0]) &&
      !isNaN(center[1]) &&
      typeof zoom === "number" &&
      !isNaN(zoom)
    ) {
      try {
        map.setView(center, zoom);
      } catch (e) {
        console.error("Error setting map view:", e);
      }
    } else if (
      center &&
      Array.isArray(center) &&
      center.length === 2 &&
      !isNaN(center[0]) &&
      !isNaN(center[1])
    ) {
      try {
        map.setView(center);
      } catch (e) {
        console.error("Error setting map center:", e);
      }
    }
  }, [center, zoom, map]);
  return null;
}

// --- Main App Component ---
function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchPostcode, setActiveSearchPostcode] = useState(""); // Track the postcode being searched
  const [isSearchingLRDemo, setIsSearchingLRDemo] = useState(false); // Loading state for LR/Demo
  const [searchResults, setSearchResults] = useState(null); // For LR/Demo results/errors
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [view, setView] = useState("listings");
  const [mapCenter, setMapCenter] = useState([54.57, -1.23]);
  const [mapZoom, setMapZoom] = useState(13);
  const [heatmapPoints, setHeatmapPoints] = useState([]);

  // --- State for Scraped Listings (SSE) ---
  const [scrapedListings, setScrapedListings] = useState([]);
  const [isFetchingScraper, setIsFetchingScraper] = useState(false); // Loading state specifically for scraper
  const [scraperError, setScraperError] = useState(null);
  const [isScrapingComplete, setIsScrapingComplete] = useState(false);
  const eventSourceRef = useRef(null); // Ref to hold the EventSource instance

  // Determine if the main loading screen should be visible
  // Show full-screen loader when we're loading AND either:
  // 1. No properties found yet OR
  // 2. We're within 2 seconds of starting the search (for a smoother UX)
  const [searchStartTime, setSearchStartTime] = useState(null);
  const isLoading =
    (isFetchingScraper || isSearchingLRDemo) &&
    (scrapedListings.length === 0 ||
      (searchStartTime && Date.now() - searchStartTime < 2000));

  // Get a loading message based on current state
  const getLoadingMessage = () => {
    if (!activeSearchPostcode) return "Preparing search...";
    if (scrapedListings.length > 0)
      return `Found ${scrapedListings.length} properties...`;
    return `Searching ${activeSearchPostcode}`;
  };

  // --- Sample Featured Properties ---
  const sampleProperties = [
    {
      id: 1,
      title: "Modern Apartment in Chelsea",
      location: "Chelsea, London",
      postcode: "SW3 5RZ",
      coordinates: [51.49, -0.17],
      details: { bedrooms: 2, bathrooms: 2, sqft: 950, age: 5 },
      price: {
        asking: "£850,000",
        estimated: "£875,000",
        roi: "No result",
        rentalYield: "3.4%",
      },
      amenities: ["Gym", "Concierge", "Parking"],
      transport: [{ name: "Sloane Square Station", distance: "0.3mi" }],
      schools: ["Chelsea Primary School"],
      riskScore: "2/5",
      image: "https://placehold.co/600x400/cccccc/1d1d1d?text=Chelsea+Apt",
      source: "Featured",
    },
    {
      id: 2,
      title: "Stylish Loft in Kensington",
      location: "Kensington, London",
      postcode: "W8 7BU",
      coordinates: [51.5, -0.19],
      details: { bedrooms: 3, bathrooms: 3, sqft: 1100, age: 3 },
      price: {
        asking: "£950,000",
        estimated: "£1,000,000",
        roi: "No result",
        rentalYield: "4.2%",
      },
      amenities: ["Fitness Center", "Doorman", "Garage"],
      transport: [{ name: "Kensington High St Station", distance: "0.2mi" }],
      schools: ["Kensington Primary"],
      riskScore: "1/5",
      image: "https://placehold.co/600x400/cccccc/1d1d1d?text=Kensington+Loft",
      source: "Featured",
    },
  ];
  const [featuredProperties] = useState([...sampleProperties]);

  // --- Search Handler ---
  const startScraperStream = useCallback((postcode) => {
    // Clear previous scraper state
    setScrapedListings([]);
    setScraperError(null);
    setIsScrapingComplete(false);
    setIsFetchingScraper(true); // Set loading true when starting

    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log("Closing previous EventSource connection.");
      eventSourceRef.current.close();
    }

    const url = `${
      process.env.REACT_APP_API_BASE_URL || "http://localhost:3001"
    }/api/scrape-listings?postcode=${encodeURIComponent(postcode)}`;
    console.log(`Connecting to SSE: ${url}`);
    const es = new EventSource(url);
    eventSourceRef.current = es; // Store reference

    es.onopen = () => {
      console.log("SSE Connection Opened");
      // Still fetching until first message or complete/error
    };

    // Listener for property data messages
    es.onmessage = (event) => {
      // console.log("SSE message:", event.data); // Can be very verbose
      try {
        const propertyData = JSON.parse(event.data);
        // Add the new property to the state
        setScrapedListings((prevListings) => [...prevListings, propertyData]);
        // Optional: Update map center based on first received listing?
        // if (scrapedListings.length === 0 && propertyData.latitude && propertyData.longitude) { ... }
      } catch (error) {
        console.error("Failed to parse SSE property data:", event.data, error);
        // Decide if this should be a user-facing error
      }
    };

    // Listener for custom 'error' events
    es.addEventListener("error", (event) => {
      console.error("SSE 'error' event received:", event.data);
      try {
        const errorData = JSON.parse(event.data);
        setScraperError(errorData.error || "Unknown scraper error occurred.");
      } catch (e) {
        setScraperError("Received an unparsable error from scraper.");
      }
      setIsFetchingScraper(false); // Stop loading on error
      setIsScrapingComplete(true); // Mark as complete (even though it errored)
      es.close(); // Close connection on error event
      eventSourceRef.current = null;
    });

    // Listener for custom 'status' events (e.g., no_results, initialized)
    es.addEventListener("status", (event) => {
      console.log("SSE 'status' event received:", event.data);
      try {
        const statusData = JSON.parse(event.data);
        if (statusData.status === "no_results") {
          console.log("Scraper reported no results found.");
          // You could set a specific message here if needed
          // setScraperStatusMessage("No listings found for this area.");
        } else if (statusData.status === "initialized") {
          console.log("Scraper initialized and starting search");
          // Keep the loading state active
        }
      } catch (e) {
        console.error("Failed to parse SSE status data:", event.data, e);
      }
      // Don't close connection on status update usually
    });

    // Listener for custom 'complete' events
    es.addEventListener("complete", (event) => {
      console.log("SSE 'complete' event received:", event.data);
      setIsScrapingComplete(true);
      setIsFetchingScraper(false); // Stop loading on completion
      es.close(); // Close connection on complete event
      eventSourceRef.current = null;
    });

    // Listener for fundamental connection errors
    es.onerror = (err) => {
      console.error("EventSource failed:", err);
      setScraperError("Connection error while fetching listings.");
      setIsFetchingScraper(false); // Stop loading on connection error
      setIsScrapingComplete(true); // Mark as complete (due to error)
      es.close(); // Close the connection
      eventSourceRef.current = null;
    };
  }, []); // No dependencies needed for the function definition itself

  // --- Cleanup Effect for EventSource ---
  useEffect(() => {
    // Return a cleanup function that will be called when the component unmounts
    return () => {
      if (eventSourceRef.current) {
        console.log("Closing EventSource connection on component unmount.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

  // --- Search Handler - Initiates all fetches ---
  const handleSearch = useCallback(
    async (e) => {
      if (e) e.preventDefault();

      const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
      const query = searchQuery.trim();

      if (!query || !postcodeRegex.test(query)) {
        setSearchResults({ errorMessage: "Please enter a valid UK postcode." });
        // Clear previous search state
        setActiveSearchPostcode("");
        setScrapedListings([]);
        setScraperError(null);
        setIsFetchingScraper(false);
        setIsScrapingComplete(false);
        setSearchStartTime(null);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        } // Close existing stream
        return;
      }

      // --- Reset State for NEW search ---
      setIsSearchingLRDemo(true); // Start LR/Demo loading
      setSearchResults(null);
      setSelectedProperty(null);
      setView("listings");
      setHeatmapPoints([]);
      setActiveSearchPostcode(query); // Set the postcode that triggers effects/streams
      setSearchStartTime(Date.now()); // Record search start time for UX timing

      // --- Start Scraper Stream ---
      // This function call now just *starts* the stream, doesn't wait for it
      startScraperStream(query);

      // --- Fetch LR/Demo Data Concurrently (still useful for heatmap/detail view) ---
      let fetchedCoordinates = null;
      let landRegistryError = null;
      let demoError = null;

      try {
        // Geocode first
        fetchedCoordinates = await getCoordinatesFromPostcode(query);
        if (fetchedCoordinates) {
          setMapCenter([fetchedCoordinates.lat, fetchedCoordinates.lng]);
          setMapZoom(15);
        } else {
          console.warn("Geocoding failed for search query.");
          setMapCenter([54.57, -1.23]);
          setMapZoom(13);
        }

        console.log("Starting concurrent fetches: LR, Demo");
        const landRegistryPromise = fetchPropertyDataByPostcode(query)
          .then((apiData) => ({
            type: "lr",
            data: formatTransactionData(apiData),
          }))
          .catch((err) => ({
            type: "lr",
            error: err.message || "Failed to fetch property data.",
          }));

        const demographicsPromise = fetchDemographicData(query)
          .then((demoData) => ({ type: "demo", data: demoData }))
          .catch((err) => ({
            type: "demo",
            error: err.message || "Failed to fetch demographic data.",
          }));

        const results = await Promise.allSettled([
          landRegistryPromise,
          demographicsPromise,
        ]);
        console.log("Concurrent LR/Demo fetch results:", results);

        let transactions = [];
        let demographicsResult = null;

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const value = result.value || {};
            if (value.error) {
              if (value.type === "lr") landRegistryError = value.error;
              if (value.type === "demo") demoError = value.error;
            } else {
              if (value.type === "lr") transactions = value.data || [];
              if (value.type === "demo")
                demographicsResult = value.data || null;
            }
          } else {
            /* Handle rejected LR/Demo promises */
            const reason = result.reason?.message || "Unknown fetch error";
            console.error("A LR/Demo fetch promise was rejected:", reason);
            if (
              reason.toLowerCase().includes("property data") ||
              reason.toLowerCase().includes("land registry")
            )
              landRegistryError = landRegistryError || reason;
            else if (reason.toLowerCase().includes("demographic"))
              demoError = demoError || reason;
          }
        });

        // Create Heatmap (remains the same logic)
        if (transactions.length > 0 && fetchedCoordinates) {
          const prices = transactions
            .map((t) => t.price)
            .filter((p) => typeof p === "number" && !isNaN(p));
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice;
            const points = transactions
              .filter((t) => typeof t.price === "number" && !isNaN(t.price))
              .map((t) => {
                let intensity =
                  priceRange > 0
                    ? 0.1 + 0.9 * ((t.price - minPrice) / priceRange)
                    : 0.5;
                intensity = Math.max(0.1, Math.min(1.0, intensity));
                const randomOffsetLat = (Math.random() - 0.5) * 0.004;
                const randomOffsetLng = (Math.random() - 0.5) * 0.004;
                return [
                  fetchedCoordinates.lat + randomOffsetLat,
                  fetchedCoordinates.lng + randomOffsetLng,
                  intensity,
                ];
              });
            setHeatmapPoints(points);
            console.log(`Generated ${points.length} heatmap points.`);
          } else {
            setHeatmapPoints([]);
          }
        } else {
          setHeatmapPoints([]);
        }

        // Set overall search status (primarily based on LR/Demo now)
        if (
          !transactions.length &&
          !demographicsResult &&
          (landRegistryError || demoError)
        ) {
          const combinedError = [landRegistryError, demoError]
            .filter(Boolean)
            .join("; ");
          setSearchResults({
            errorMessage:
              combinedError || "No historical or demographic data found.",
          });
        } else {
          setSearchResults({ success: true }); // Indicate LR/Demo fetch completed
        }
      } catch (error) {
        // Catch geocoding errors etc.
        console.error("Error during LR/Demo fetch execution:", error);
        setSearchResults({
          errorMessage: `Area data fetch failed: ${
            error.message || "Please try again."
          }`,
        });
        setHeatmapPoints([]);
      } finally {
        setIsSearchingLRDemo(false); // Finish LR/Demo loading
      }
    },
    [searchQuery, startScraperStream] // Include startScraperStream dependency
  );

  // --- Handler for viewing SCRAPED property details (needs updating) ---
  const handleViewScrapedProperty = useCallback(
    async (scrapedListing) => {
      // This function now relies MORE on the initial scrapedListing data,
      // but we still fetch LR/Demo for the detail view enhancement.
      if (!activeSearchPostcode) return; // Need the postcode used for the search

      console.log("Viewing scraped property:", scrapedListing);
      setHeatmapPoints([]); // Clear heatmap

      const lat = scrapedListing.latitude
        ? parseFloat(scrapedListing.latitude)
        : null;
      const lon = scrapedListing.longitude
        ? parseFloat(scrapedListing.longitude)
        : null;
      const validCoordinates =
        lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);

      // Use activeSearchPostcode for consistency
      const initialProperty = {
        id: scrapedListing.id || `scraped-${Date.now()}`,
        title: scrapedListing.address || "Scraped Listing",
        location:
          scrapedListing.address?.split(",").slice(-2).join(", ").trim() ||
          "Unknown Location",
        postcode: activeSearchPostcode.toUpperCase(), // Use the postcode from the active search
        coordinates: validCoordinates ? [lat, lon] : null,
        details: {
          bedrooms: scrapedListing.bedrooms || "N/A",
          bathrooms: scrapedListing.bathrooms || "N/A",
          sqft: scrapedListing.square_footage || "N/A",
          propertyType: scrapedListing.property_type || "N/A",
          age: "N/A",
        },
        price: {
          asking: scrapedListing.price || "N/A",
          estimated: "Loading...",
          roi: "Loading...",
          rentalYield: "N/A",
        },
        description: scrapedListing.description || "",
        amenities: [],
        transport: [],
        schools: [],
        riskScore: "N/A",
        image: `https://placehold.co/600x400/d1c4e9/4527a0?text=${encodeURIComponent(
          scrapedListing.address?.split(",")[0] || "Listing"
        )}`,
        source: scrapedListing.source || "Rightmove",
        detail_url: scrapedListing.detail_url,
        transactionHistory: null,
        priceGrowth: null,
        demographicData: null,
        isLoadingLR: true,
        isLoadingDemo: true,
      };

      setSelectedProperty(initialProperty);
      setView("detail");
      if (initialProperty.coordinates) {
        setMapCenter(initialProperty.coordinates);
        setMapZoom(17);
      }

      // --- Asynchronously fetch LR and Demo data using the activeSearchPostcode ---
      try {
        console.log(
          `Fetching LR/Demo for detail view (postcode: ${activeSearchPostcode})`
        );
        const lrPromise = fetchPropertyDataByPostcode(
          activeSearchPostcode
        ).then(formatTransactionData);
        const demoPromise = fetchDemographicData(activeSearchPostcode);

        const [lrResult, demoResult] = await Promise.allSettled([
          lrPromise,
          demoPromise,
        ]);

        let fetchedTransactions = [];
        let fetchedDemographics = null;
        let detailLrError = null;
        let detailDemoError = null;

        if (lrResult.status === "fulfilled") {
          fetchedTransactions = lrResult.value || [];
        } else {
          detailLrError =
            lrResult.reason?.message || "Failed to load transaction history.";
          console.error("Detail LR Error:", detailLrError);
        }

        if (demoResult.status === "fulfilled") {
          fetchedDemographics = demoResult.value || null;
        } else {
          detailDemoError =
            demoResult.reason?.message || "Failed to load demographics.";
          console.error("Detail Demo Error:", detailDemoError);
          fetchedDemographics = { error: detailDemoError };
        }

        const priceGrowthMetrics =
          !detailLrError && fetchedTransactions.length > 0
            ? calculatePriceGrowth(fetchedTransactions)
            : null;
        const estimatedPrice =
          !detailLrError && fetchedTransactions.length > 0
            ? `£${Math.round(
                fetchedTransactions.reduce((sum, t) => sum + t.price, 0) /
                  fetchedTransactions.length
              ).toLocaleString()}`
            : "N/A";

        setSelectedProperty((prev) => {
          if (!prev || prev.id !== initialProperty.id) return prev;
          return {
            ...prev,
            transactionHistory: detailLrError ? [] : fetchedTransactions,
            priceGrowth: priceGrowthMetrics || {
              growth: detailLrError || "N/A",
              annualizedReturn: detailLrError || "N/A",
            },
            price: {
              ...prev.price,
              estimated: estimatedPrice,
              roi: priceGrowthMetrics?.annualizedReturn || "N/A",
            },
            demographicData: fetchedDemographics,
            isLoadingLR: false,
            isLoadingDemo: false,
          };
        });
      } catch (error) {
        /* ... existing error handling ... */
        console.error("Unexpected error fetching detail LR/Demo:", error);
        setSelectedProperty((prev) => {
          if (!prev || prev.id !== initialProperty.id) return prev;
          return {
            /* ... set error states ... */
          };
        });
      }
    },
    [activeSearchPostcode] // Depends on the postcode used for the search
  );

  // --- Handlers for Featured Properties (remain the same) ---
  const handleViewFeaturedProperty = useCallback((property) => {
    setScrapedListings([]);
    setScraperError(null);
    setHeatmapPoints([]);
    setSearchResults(null);
    setSelectedProperty({
      ...property,
      isLoadingLR: false,
      isLoadingDemo: false,
      source: "Featured",
    });
    setView("detail");
    if (property.coordinates) {
      setMapCenter(property.coordinates);
      setMapZoom(16);
    }
  }, []);
  const handleBackToListings = useCallback(() => {
    setSelectedProperty(null);
    setView("listings");
  }, []);

  // --- Render ---
  return (
    <div className="App">
      <LoadingScreen
        isVisible={isLoading}
        message={getLoadingMessage()}
        itemsFound={scrapedListings.length}
      />

      <div className="app-container">
        {/* --- Left Panel: Map and Search --- */}
        <div className="map-panel">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Enter UK Postcode (e.g., SW1A 0AA)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearchingLRDemo || isFetchingScraper} // Disable if any loading is happening
            />
            <button
              type="submit"
              disabled={isSearchingLRDemo || isFetchingScraper}
            >
              {isSearchingLRDemo || isFetchingScraper
                ? "Searching..."
                : "Search"}
            </button>
          </form>

          {/* Display Search Status/Errors - Keep this for non-blocking feedback once properties start appearing */}
          <div className="search-status-container">
            {/* Combined Loading Indicator - Keep for in-progress feedback */}
            {(isSearchingLRDemo || isFetchingScraper) &&
              scrapedListings.length > 0 && (
                <div className="search-status info-message loading-indicator">
                  <p>
                    Loading {isFetchingScraper ? "Listings" : ""}
                    {isFetchingScraper && isSearchingLRDemo ? " & " : ""}
                    {isSearchingLRDemo ? "Area Data" : ""}...
                    {isFetchingScraper &&
                      !isScrapingComplete &&
                      ` (${scrapedListings.length} found)`}
                  </p>
                </div>
              )}
            {/* Scraper Error */}
            {scraperError && (
              <div className="search-status error-message">
                <p>Listings Error: {scraperError}</p>
              </div>
            )}
            {/* LR/Demo Error */}
            {searchResults?.errorMessage && (
              <div className="search-status error-message">
                <p>Area Data Error: {searchResults.errorMessage}</p>
              </div>
            )}
            {/* Completion Message */}
            {isScrapingComplete && !scraperError && (
              <div className="search-status info-message">
                <p>
                  Finished loading listings ({scrapedListings.length} found).
                </p>
              </div>
            )}
          </div>

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="map-container"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution="..."
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            {heatmapPoints && heatmapPoints.length > 0 && (
              <HeatmapLayer data={heatmapPoints} />
            )}

            {/* Markers for FEATURED Properties */}
            {view === "listings" &&
              featuredProperties.map(
                (property) =>
                  property.coordinates && (
                    <Marker
                      key={`featured-${property.id}`}
                      position={property.coordinates}
                    >
                      <Popup>
                        <b>{property.title}</b>
                        <br />
                        {property.price?.asking || "Price N/A"}
                        <br />
                        <button
                          onClick={() => handleViewFeaturedProperty(property)}
                          className="popup-button"
                        >
                          View Details
                        </button>
                      </Popup>
                    </Marker>
                  )
              )}

            {/* Markers for SCRAPED Properties (updates based on scrapedListings state) */}
            {view === "listings" &&
              scrapedListings.map((listing, index) => {
                const lat = parseFloat(listing.latitude);
                const lon = parseFloat(listing.longitude);
                if (!isNaN(lat) && !isNaN(lon)) {
                  return (
                    <Marker
                      key={listing.id || `scraped-${index}`}
                      position={[lat, lon]}
                    >
                      <Popup>
                        <b>{listing.address || "Listing"}</b>
                        <br />
                        Price: {listing.price || "N/A"}
                        <br />
                        {listing.bedrooms !== "N/A" &&
                          `${listing.bedrooms} Beds `}
                        {listing.bathrooms !== "N/A" &&
                          `| ${listing.bathrooms} Baths`}
                        <br />
                        <button
                          onClick={() => handleViewScrapedProperty(listing)}
                          className="popup-button"
                        >
                          View Details
                        </button>
                      </Popup>
                    </Marker>
                  );
                } else {
                  return null;
                }
              })}

            {/* Marker for Selected Property */}
            {view === "detail" &&
              selectedProperty &&
              selectedProperty.coordinates &&
              !isNaN(selectedProperty.coordinates[0]) &&
              !isNaN(selectedProperty.coordinates[1]) && (
                <Marker
                  key={`selected-${selectedProperty.id}`}
                  position={selectedProperty.coordinates}
                >
                  <Popup>
                    <b>{selectedProperty.title}</b>
                    <br />
                    {selectedProperty.price?.asking || "N/A"}
                  </Popup>
                </Marker>
              )}
          </MapContainer>
        </div>

        {/* --- Right Panel: Listings or Details --- */}
        <div className="property-panel">
          {view === "detail" && selectedProperty ? (
            <PropertyDetail
              property={selectedProperty}
              isLoadingLR={selectedProperty.isLoadingLR}
              isLoadingDemo={selectedProperty.isLoadingDemo}
              onBackToListings={handleBackToListings}
            />
          ) : (
            // --- Listings View ---
            <>
              {/* Display Scraped Listings Cards (updates as scrapedListings state grows) */}
              {scrapedListings.length > 0 && (
                <div className="listings-section">
                  <h2>
                    Listings Found ({scrapedListings.length}){" "}
                    {isFetchingScraper && !isScrapingComplete
                      ? "(Loading...)"
                      : ""}
                  </h2>
                  <div className="property-list">
                    {scrapedListings.map((listing, index) => {
                      const lat = parseFloat(listing.latitude);
                      const lon = parseFloat(listing.longitude);
                      const validCoordinates = !isNaN(lat) && !isNaN(lon);
                      return (
                        <PropertyCard
                          key={listing.id || `scraped-card-${index}`}
                          property={{
                            id: listing.id || `scraped-card-${index}`,
                            title: listing.address || "Scraped Listing",
                            location:
                              listing.address
                                ?.split(",")
                                .slice(-2)
                                .join(", ")
                                .trim() || activeSearchPostcode.toUpperCase(),
                            postcode: activeSearchPostcode.toUpperCase(),
                            coordinates: validCoordinates ? [lat, lon] : null,
                            details: {
                              bedrooms: listing.bedrooms,
                              bathrooms: listing.bathrooms,
                              sqft: listing.square_footage,
                              propertyType: listing.property_type,
                              age: "N/A",
                            },
                            price: {
                              asking: listing.price,
                              estimated: "N/A",
                              roi: "N/A",
                              rentalYield: "N/A",
                            },
                            image: `https://placehold.co/600x400/d1c4e9/4527a0?text=${encodeURIComponent(
                              listing.address?.split(",")[0] || "Listing"
                            )}`,
                            amenities: [],
                            transport: [],
                            schools: [],
                            riskScore: "N/A",
                            source: listing.source || "Rightmove",
                          }}
                          onViewProperty={() =>
                            handleViewScrapedProperty(listing)
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Display Featured Properties Section */}
              {featuredProperties.length > 0 &&
                scrapedListings.length === 0 &&
                !isFetchingScraper &&
                !scraperError && (
                  <div className="listings-section featured-section">
                    <h2>Featured Properties</h2>
                    <div className="property-list">
                      {featuredProperties.map((property) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          onViewProperty={() =>
                            handleViewFeaturedProperty(property)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* Message if no listings shown and not loading/searching */}
              {scrapedListings.length === 0 &&
                !isFetchingScraper &&
                !isSearchingLRDemo && (
                  <div className="no-results-message">
                    {/* Show initial prompt only if no search has been done */}
                    {!activeSearchPostcode && (
                      <p>
                        Enter a postcode to search for listings and area data.
                      </p>
                    )}
                    {/* Show specific messages if a search was done but yielded nothing */}
                    {activeSearchPostcode &&
                      !scraperError &&
                      isScrapingComplete && (
                        <p>No listings found for {activeSearchPostcode}.</p>
                      )}
                    {activeSearchPostcode && scraperError && (
                      <p className="error-text">
                        Could not load listings: {scraperError}
                      </p>
                    )}
                    {activeSearchPostcode && searchResults?.errorMessage && (
                      <p className="error-text">
                        Could not load area data: {searchResults.errorMessage}
                      </p>
                    )}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
