import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Import L for default icon fix

import HeatmapLayer from "./components/HeatmapLayer";
import PropertyCard from "./components/PropertyCard";
import PropertyDetail from "./components/PropertyDetail";
import {
  fetchPropertyDataByPostcode,
  formatTransactionData,
  calculatePriceGrowth,
} from "./services/landRegistryService";
import { fetchDemographicData } from "./services/demographicsService";
import { fetchScrapedListings } from "./services/listingsService";

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
            throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Geocoding response:", data);
        if (data && data.length > 0) {
            const { lat, lon, address } = data[0];
            const town = address?.city || address?.town || address?.village || address?.county || address?.state || null;
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
      center && Array.isArray(center) && center.length === 2 &&
      !isNaN(center[0]) && !isNaN(center[1]) &&
      typeof zoom === "number" && !isNaN(zoom)
    ) {
      try {
        map.setView(center, zoom);
      } catch (e) {
        console.error("Error setting map view:", e);
      }
    } else if (
      center && Array.isArray(center) && center.length === 2 &&
      !isNaN(center[0]) && !isNaN(center[1])
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [view, setView] = useState("listings");
  const [mapCenter, setMapCenter] = useState([54.57, -1.23]); // Default Middlesbrough center
  const [mapZoom, setMapZoom] = useState(13); // Adjust zoom for area
  const [heatmapPoints, setHeatmapPoints] = useState([]);

  // --- State for Scraped Listings ---
  const [scrapedListings, setScrapedListings] = useState([]);
  const [isFetchingScraper, setIsFetchingScraper] = useState(false);
  const [scraperError, setScraperError] = useState(null);

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
  const handleSearch = useCallback(
    async (e) => {
      if (e) e.preventDefault();

      const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
      const query = searchQuery.trim();

      if (!query || !postcodeRegex.test(query)) {
        setSearchResults({ errorMessage: "Please enter a valid UK postcode." });
        setIsSearching(false);
        setIsFetchingScraper(false);
        return;
      }

      // --- Reset State ---
      setIsSearching(true);
      setIsFetchingScraper(true);
      setSearchResults(null);
      setSelectedProperty(null);
      setView("listings");
      setHeatmapPoints([]);
      setScrapedListings([]);
      setScraperError(null);

      let fetchedCoordinates = null;
      let landRegistryError = null;
      let demoError = null;

      try {
        // --- 1. Geocode ---
        fetchedCoordinates = await getCoordinatesFromPostcode(query);
        if (fetchedCoordinates) {
          setMapCenter([fetchedCoordinates.lat, fetchedCoordinates.lng]);
          setMapZoom(15);
        } else {
          console.warn("Geocoding failed for search query.");
          setMapCenter([54.57, -1.23]); // Reset to default if geocoding fails
          setMapZoom(13);
        }

        // --- 2. Fetch Data Concurrently ---
        console.log("Starting concurrent fetches: LR, Demo, Scraper");
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

        const scraperPromise = fetchScrapedListings(query)
          .then((listingsData) => {
              // Handle potential error object from scraper
              if (listingsData && listingsData.error && listingsData.results) {
                  console.warn("Scraper finished with error, but returned partial results:", listingsData.error);
                  setScraperError(`Scraper Error: ${listingsData.error}`); // Set error state
                  return { type: "scrape", data: listingsData.results }; // Use partial results
              } else if (Array.isArray(listingsData)) {
                  return { type: "scrape", data: listingsData }; // Success case
              } else {
                   // Handle case where scraper returns something unexpected but not an array or the error object
                   console.error("Unexpected scraper output format:", listingsData);
                   return { type: "scrape", error: "Scraper returned unexpected data format." };
              }
          })
          .catch((err) => ({
            type: "scrape",
            error: err.message || "Failed to fetch listings.",
          }));

        const results = await Promise.allSettled([
          landRegistryPromise,
          demographicsPromise,
          scraperPromise,
        ]);

        console.log("Concurrent fetch results:", results);

        // Process results
        let transactions = [];
        let demographicsResult = null;
        let fetchedScrapedListings = [];
        let currentScraperError = scraperError; // Initialize with potentially pre-set error from promise handling

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const value = result.value || {};
            const { type, data, error } = value;

            if (error) {
              if (type === "lr") landRegistryError = error;
              if (type === "demo") demoError = error;
              if (type === "scrape") currentScraperError = currentScraperError || error; // Keep existing error if already set
            } else {
              if (type === "lr") transactions = data || [];
              if (type === "demo") demographicsResult = data || null;
              if (type === "scrape") fetchedScrapedListings = data || [];
            }
          } else {
            const reason = result.reason?.message || "Unknown fetch error";
            console.error("A fetch promise was rejected:", reason);
             // Try to attribute the error more reliably
             if (result.reason?.config?.url?.includes('land-registry')) {
                landRegistryError = landRegistryError || reason;
             } else if (result.reason?.config?.url?.includes('demographics')) {
                 demoError = demoError || reason;
             } else if (result.reason?.config?.url?.includes('scrape-listings')) {
                  currentScraperError = currentScraperError || reason;
             } else { // Fallback
                landRegistryError = landRegistryError || `Fetch failed: ${reason}`;
                demoError = demoError || `Fetch failed: ${reason}`;
                currentScraperError = currentScraperError || `Fetch failed: ${reason}`;
             }
          }
        });

        // --- 3. Update State ---
        setScrapedListings(fetchedScrapedListings);
        setScraperError(currentScraperError); // Update state with the final error status

        // Create Heatmap (remains the same)
        if (transactions.length > 0 && fetchedCoordinates) {
          const prices = transactions.map((t) => t.price).filter((p) => typeof p === 'number' && !isNaN(p));
          if (prices.length > 0) {
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              const priceRange = maxPrice - minPrice;
              const points = transactions
                  .filter(t => typeof t.price === 'number' && !isNaN(t.price))
                  .map((t) => {
                      let intensity = 0.5;
                      if (priceRange > 0) {
                          intensity = 0.1 + 0.9 * ((t.price - minPrice) / priceRange);
                      }
                      intensity = Math.max(0.1, Math.min(1.0, intensity));
                      const randomOffsetLat = (Math.random() - 0.5) * 0.004;
                      const randomOffsetLng = (Math.random() - 0.5) * 0.004;
                      return [fetchedCoordinates.lat + randomOffsetLat, fetchedCoordinates.lng + randomOffsetLng, intensity];
                  });
              setHeatmapPoints(points);
              console.log(`Generated ${points.length} heatmap points.`);
          } else { setHeatmapPoints([]); }
        } else {
          setHeatmapPoints([]);
        }

        // --- 4. Set Search Status ---
         if (
           fetchedScrapedListings.length === 0 &&
           transactions.length === 0 && // Check transactions too
           !demographicsResult && // Check demo too
           (currentScraperError || landRegistryError || demoError) // Only show error if something actually failed
         ) {
           const combinedError = [currentScraperError, landRegistryError, demoError]
             .filter(Boolean) // Remove null/undefined errors
             .map(e => e.replace(/^Scraper Error: /, '')) // Clean up prefix if needed
             .join("; ");
           setSearchResults({
             errorMessage: combinedError || "No data found and failed to fetch some sources.",
           });
         } else if (fetchedScrapedListings.length === 0 && currentScraperError && (transactions.length > 0 || demographicsResult)) {
              // If scraping failed but other data exists
              setSearchResults({
                 infoMessage: "Could not load current listings. Displaying historical sales and area data.",
              });
          } else if (fetchedScrapedListings.length === 0 && transactions.length === 0 && !demographicsResult && !currentScraperError && !landRegistryError && !demoError) {
              // If all fetches succeeded but returned no data
              setSearchResults({ infoMessage: "No property listings or historical data found for this postcode." });
          }
          else {
           setSearchResults({ success: true }); // Indicate search completed with some results
         }

      } catch (error) {
        console.error("Error during overall search execution:", error);
        setSearchResults({
          errorMessage: `Search failed unexpectedly: ${error.message || "Please try again."}`,
        });
        setHeatmapPoints([]);
        setScrapedListings([]);
        setScraperError(error.message); // Set scraper error state as well
      } finally {
        setIsSearching(false);
        setIsFetchingScraper(false);
      }
    },
    [searchQuery] // Keep searchQuery as dependency
  );

  // --- Handler when clicking "View Details" on a SCRAPED property marker ---
  const handleViewScrapedProperty = useCallback(
    async (scrapedListing) => {
      if (!searchQuery) {
        console.error("Cannot fetch details without a search query (postcode).");
        return;
      }
      console.log("Viewing scraped property:", scrapedListing);
      setHeatmapPoints([]); // Clear heatmap

      // --- Create Initial Property Object from Scraped Data ---
      // Ensure coordinates are parsed correctly here
       const lat = scrapedListing.latitude ? parseFloat(scrapedListing.latitude) : null;
       const lon = scrapedListing.longitude ? parseFloat(scrapedListing.longitude) : null;
       const validCoordinates = lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);

      const initialProperty = {
        id: scrapedListing.id || `scraped-${Date.now()}`,
        title: scrapedListing.address || "Scraped Listing",
        location: scrapedListing.address?.split(",").slice(-2).join(", ").trim() || "Unknown Location",
        postcode: searchQuery.toUpperCase(),
        // Use parsed and validated coordinates
        coordinates: validCoordinates ? [lat, lon] : null,
        details: {
          bedrooms: scrapedListing.bedrooms || "N/A",
          bathrooms: scrapedListing.bathrooms || "N/A",
          sqft: scrapedListing.square_footage || "N/A",
          propertyType: scrapedListing.property_type || "N/A",
          age: "N/A", // Added age default
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
        riskScore: "N/A", // Added default
        image: `https://placehold.co/600x400/d1c4e9/4527a0?text=${encodeURIComponent(scrapedListing.address?.split(",")[0] || "Listing")}`,
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

      // Center map if coordinates are valid
      if (initialProperty.coordinates) {
        setMapCenter(initialProperty.coordinates);
        setMapZoom(17);
      } else {
        console.warn("Scraped property has no valid coordinates, map won't center on it.");
        // Keep the existing map center based on postcode geocoding
      }

      // --- Asynchronously fetch LR and Demo data (remains the same) ---
      try {
        console.log(`Fetching LR/Demo for selected scraped property (postcode: ${searchQuery})`);
        const lrPromise = fetchPropertyDataByPostcode(searchQuery).then(formatTransactionData);
        const demoPromise = fetchDemographicData(searchQuery);

        const [lrResult, demoResult] = await Promise.allSettled([lrPromise, demoPromise]);

        let fetchedTransactions = [];
        let fetchedDemographics = null;
        let detailLrError = null;
        let detailDemoError = null;

        if (lrResult.status === "fulfilled") { fetchedTransactions = lrResult.value || []; }
        else { detailLrError = lrResult.reason?.message || "Failed to load transaction history."; console.error("Error fetching LR data for detail view:", detailLrError); }

        if (demoResult.status === "fulfilled") { fetchedDemographics = demoResult.value || null; }
        else { detailDemoError = demoResult.reason?.message || "Failed to load demographics."; console.error("Error fetching Demo data for detail view:", detailDemoError); fetchedDemographics = { error: detailDemoError }; }

        const priceGrowthMetrics = !detailLrError && fetchedTransactions.length > 0 ? calculatePriceGrowth(fetchedTransactions) : null;
        const estimatedPrice = !detailLrError && fetchedTransactions.length > 0 ? `£${Math.round(fetchedTransactions.reduce((sum, t) => sum + t.price, 0) / fetchedTransactions.length).toLocaleString()}` : "N/A";

        console.log("LR/Demo fetch complete for selected scraped property.");

        setSelectedProperty((prev) => {
          if (!prev || prev.id !== initialProperty.id) return prev; // Check ID match
          return {
            ...prev,
            transactionHistory: detailLrError ? [] : fetchedTransactions,
            priceGrowth: priceGrowthMetrics || { growth: detailLrError || "N/A", annualizedReturn: detailLrError || "N/A" },
            price: { ...prev.price, estimated: estimatedPrice, roi: priceGrowthMetrics?.annualizedReturn || "N/A" },
            demographicData: fetchedDemographics,
            isLoadingLR: false,
            isLoadingDemo: false,
          };
        });
      } catch (error) {
        console.error("Unexpected error fetching LR/Demo for selected scraped property:", error);
        setSelectedProperty((prev) => {
           if (!prev || prev.id !== initialProperty.id) return prev; // Check ID match
          return {
            ...prev,
            transactionHistory: [],
            priceGrowth: { growth: "Error", annualizedReturn: "Error" },
            price: { ...prev.price, estimated: "Error", roi: "Error" },
            demographicData: { error: `Failed to load details: ${error.message}` },
            isLoadingLR: false,
            isLoadingDemo: false,
          };
        });
      }
    },
    [searchQuery]
  );

  // --- View Handler for FEATURED properties (remains the same) ---
  const handleViewFeaturedProperty = useCallback((property) => {
    setScrapedListings([]);
    setScraperError(null);
    setHeatmapPoints([]);
    setSearchResults(null);
    setSelectedProperty({ ...property, isLoadingLR: false, isLoadingDemo: false, source: "Featured" });
    setView("detail");
    if (property.coordinates) { setMapCenter(property.coordinates); setMapZoom(16); }
  }, []);

  // --- Back Button Handler (remains the same) ---
  const handleBackToListings = useCallback(() => {
    setSelectedProperty(null);
    setView("listings");
  }, []);

  // --- Render ---
  return (
    <div className="App">
      <div className="app-container">
        {/* --- Left Panel: Map and Search --- */}
        <div className="map-panel">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Enter UK Postcode (e.g., SW1A 0AA)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching || isFetchingScraper}
            />
            <button type="submit" disabled={isSearching || isFetchingScraper}>
              {isSearching || isFetchingScraper ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Display Search Status/Errors */}
          <div className="search-status-container">
            {/* Combined Loading Indicator */}
            {(isSearching || isFetchingScraper) && (
              <div className="search-status info-message loading-indicator">
                <p>Loading {isSearching && !isFetchingScraper ? 'Area Data' : (isFetchingScraper ? 'Listings & Data' : '')}...</p>
              </div>
            )}
             {/* Error Messages */}
            {view === "listings" && !isSearching && !isFetchingScraper && searchResults?.errorMessage && (
              <div className="search-status error-message">
                <p>{searchResults.errorMessage}</p>
              </div>
            )}
            {view === "listings" && !isSearching && !isFetchingScraper && scraperError && (
              <div className="search-status error-message">
                <p>Listings Status: {scraperError.replace(/^Scraper Error: /, '')}</p> {/* Avoid duplicate prefix */}
              </div>
            )}
            {/* Info Messages */}
            {view === "listings" && !isSearching && !isFetchingScraper && searchResults?.infoMessage && (
              <div className="search-status info-message">
                <p>{searchResults.infoMessage}</p>
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
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Render Heatmap */}
            {heatmapPoints && heatmapPoints.length > 0 && (
              <HeatmapLayer data={heatmapPoints} />
            )}

            {/* Markers for FEATURED Properties (only in listings view) */}
             {view === "listings" &&
               featuredProperties.map(
                 (property) =>
                   property.coordinates && (
                     <Marker key={`featured-${property.id}`} position={property.coordinates}>
                       <Popup>
                         <b>{property.title}</b><br />
                         {property.price?.asking || "Price N/A"}<br />
                         <button onClick={() => handleViewFeaturedProperty(property)} className="popup-button">
                           View Details
                         </button>
                       </Popup>
                     </Marker>
                   )
               )}


            {/* Markers for SCRAPED Properties (only in listings view) */}
            {view === "listings" &&
              scrapedListings.map((listing, index) => {
                // **CRITICAL:** Parse lat/lon and check for validity
                const lat = parseFloat(listing.latitude);
                const lon = parseFloat(listing.longitude);
                if (!isNaN(lat) && !isNaN(lon)) {
                  return (
                    <Marker
                      key={listing.id || `scraped-${index}`}
                      position={[lat, lon]} // Use parsed coordinates
                      // Optional: use a different icon (e.g., purple)
                      // icon={purpleIcon} // You'd need to define purpleIcon using L.icon
                    >
                      <Popup>
                        <b>{listing.address || "Listing"}</b>
                        <br />
                        Price: {listing.price || "N/A"}
                        <br />
                        {listing.bedrooms !== "N/A" && `${listing.bedrooms} Beds `}
                        {listing.bathrooms !== "N/A" && `| ${listing.bathrooms} Baths`}
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
                  // Optionally log if coordinates are invalid/missing for a scraped listing
                  if (listing.latitude !== "N/A" || listing.longitude !== "N/A") {
                     console.warn(`Skipping marker for scraped listing due to invalid coordinates: Lat=${listing.latitude}, Lon=${listing.longitude}`, listing.address);
                  }
                  return null; // Don't render marker if coords are invalid
                }
              })}

            {/* Marker for Selected Property (in detail view) */}
             {view === "detail" &&
               selectedProperty &&
               selectedProperty.coordinates && // Check coordinates exist
                !isNaN(selectedProperty.coordinates[0]) && // Check lat is number
                !isNaN(selectedProperty.coordinates[1]) && // Check lon is number
                (
                 <Marker key={`selected-${selectedProperty.id}`} position={selectedProperty.coordinates}>
                   <Popup>
                     <b>{selectedProperty.title}</b><br />
                     {selectedProperty.price?.asking || selectedProperty.price?.estimated || "Price N/A"}
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
              {/* Display Scraped Listings Cards */}
              {scrapedListings.length > 0 && (
                <div className="listings-section">
                  <h2>Listings Found ({scrapedListings.length})</h2>
                  <div className="property-list">
                    {scrapedListings.map((listing, index) => {
                      // Map scraped data to PropertyCard props
                       const lat = parseFloat(listing.latitude);
                       const lon = parseFloat(listing.longitude);
                       const validCoordinates = !isNaN(lat) && !isNaN(lon);

                      return (
                        <PropertyCard
                          key={listing.id || `scraped-card-${index}`}
                          property={{
                            id: listing.id || `scraped-card-${index}`,
                            title: listing.address || "Scraped Listing",
                            location: listing.address?.split(",").slice(-2).join(", ").trim() || searchQuery.toUpperCase(),
                            postcode: searchQuery.toUpperCase(),
                            // Pass parsed coordinates
                            coordinates: validCoordinates ? [lat, lon] : null,
                            details: {
                              bedrooms: listing.bedrooms,
                              bathrooms: listing.bathrooms,
                              sqft: listing.square_footage,
                              propertyType: listing.property_type,
                              age: 'N/A', // Add default
                            },
                            price: {
                              asking: listing.price,
                              estimated: "N/A",
                              roi: "N/A",
                              rentalYield: "N/A",
                            },
                            image: `https://placehold.co/600x400/d1c4e9/4527a0?text=${encodeURIComponent(listing.address?.split(",")[0] || "Listing")}`,
                            amenities: [],
                            transport: [],
                            schools: [],
                            riskScore: 'N/A', // Add default
                            source: listing.source || "Rightmove",
                          }}
                          onViewProperty={() => handleViewScrapedProperty(listing)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Display Featured Properties Section */}
              {/* Show featured if NO scraped listings loaded OR always show? (Current: Show if no scraped) */}
              {featuredProperties.length > 0 &&
                scrapedListings.length === 0 &&
                !isFetchingScraper &&
                !scraperError && ( // Only show if no scraping error prevented listings
                  <div className="listings-section featured-section">
                    <h2>Featured Properties</h2>
                    <div className="property-list">
                      {featuredProperties.map((property) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          onViewProperty={() => handleViewFeaturedProperty(property)}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* Message if no listings/featured shown and not loading/searching */}
              {scrapedListings.length === 0 &&
                featuredProperties.length === 0 && // Check featured too
                !isSearching && !isFetchingScraper && (
                  <div className="no-results-message">
                    <p>Enter a postcode to search for listings and area data.</p>
                    {/* Show specific messages based on search state */}
                    {searchResults?.errorMessage && <p className="error-text">{searchResults.errorMessage}</p>}
                    {scraperError && !searchResults?.errorMessage?.includes('Listings Status') && <p className="error-text">Listings Status: {scraperError.replace(/^Scraper Error: /, '')}</p>}
                    {searchResults?.infoMessage && <p>{searchResults.infoMessage}</p>}

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