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
  calculatePriceGrowth
} from "./services/landRegistryService"; // Correct path
import { fetchDemographicData } from "./services/demographicsService";

// Fix default Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


// --- Geocoding Function ---
const getCoordinatesFromPostcode = async (postcode) => {
    if (!postcode || typeof postcode !== 'string') {
      console.error("Invalid postcode provided for geocoding:", postcode);
      return null;
    }
    const formattedPostcode = encodeURIComponent(postcode.trim().toUpperCase());
    const apiUrl = `https://nominatim.openstreetmap.org/search?postalcode=${formattedPostcode}&countrycodes=gb&format=json&limit=1&addressdetails=1`; // Added addressdetails

    try {
      console.log(`Geocoding postcode: ${postcode} using URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Geocoding response:", data);

      if (data && data.length > 0) {
        const { lat, lon, address } = data[0];
         // Try to get Town/City from address details for better context
        const town = address?.city || address?.town || address?.village || address?.county || null;
        return { lat: parseFloat(lat), lng: parseFloat(lon), town: town };
      } else {
        console.warn(`No coordinates found for postcode: ${postcode}`);
        return null; // No results found
      }
    } catch (error) {
      console.error("Error fetching coordinates from Nominatim:", error);
      return null; // Return null on error
    }
};


// --- MapController Component --- (Keep as is)
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// --- Main App Component ---
function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null); // Stores status/errors
  const [selectedProperty, setSelectedProperty] = useState(null); // Can be featured or search summary
  const [view, setView] = useState("listings"); // 'listings' or 'detail'
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default London center
  const [mapZoom, setMapZoom] = useState(12); // Slightly zoomed out default
  const [heatmapPoints, setHeatmapPoints] = useState([]); // State for heatmap [lat, lng, intensity]

  const [demographicData, setDemographicData] = useState(null);
  const [isFetchingDemographics, setIsFetchingDemographics] = useState(false);
  const [demographicsError, setDemographicsError] = useState(null);

  // --- Sample Featured Properties (Keep or remove as needed) ---
  const properties = [
    {
      id: 1,
      title: "Modern Apartment in Chelsea",
      location: "Chelsea, London",
      postcode: "SW3 5RZ",
      coordinates: [51.49, -0.17],
      details: { bedrooms: 2, bathrooms: 2, sqft: 950, age: 5 },
      price: { asking: "£850,000", estimated: "£875,000", roi: "No result", rentalYield: "3.4%" }, // Set roi/yield appropriately
      amenities: ["Gym", "Concierge", "Parking"],
      transport: [{ name: "Sloane Square Station", distance: "0.3mi" }],
      schools: ["Chelsea Primary School"],
      riskScore: "2/5", // Example, needs real data
      image: "https://placehold.co/600x400/cccccc/1d1d1d?text=Chelsea+Apt",
    },
    {
      id: 2,
      title: "Stylish Loft in Kensington",
      location: "Kensington, London",
      postcode: "W8 7BU",
      coordinates: [51.5, -0.19],
      details: { bedrooms: 3, bathrooms: 3, sqft: 1100, age: 3 },
      price: { asking: "£950,000", estimated: "£1,000,000", roi: "No result", rentalYield: "4.2%" },
      amenities: ["Fitness Center", "Doorman", "Garage"],
      transport: [{ name: "Kensington High St Station", distance: "0.2mi" }],
      schools: ["Kensington Primary"],
      riskScore: "1/5", // Example
      image: "https://placehold.co/600x400/cccccc/1d1d1d?text=Kensington+Loft",
    },
  ];

  // --- Search Handler ---
  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();

    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    const query = searchQuery.trim();

    if (!query || !postcodeRegex.test(query)) {
      setSearchResults({ errorMessage: "Please enter a valid UK postcode." });
      return;
    }

    // --- Reset State ---
    setIsSearching(true);
    setIsFetchingDemographics(true); // Start fetching demographics too
    setSearchResults(null);
    setSelectedProperty(null);
    setView('listings');
    setHeatmapPoints([]);
    setDemographicData(null); // Clear previous demographics
    setDemographicsError(null); // Clear previous errors

    let fetchedCoordinates = null;
    let landRegistryTransactions = [];
    let landRegistryError = null;
    let fetchedDemographics = null; // Variable to hold fetched demo data
    let demoError = null; // Variable to hold demo error

    try {
        // --- 1. Geocode ---
        fetchedCoordinates = await getCoordinatesFromPostcode(query);
        if (fetchedCoordinates) {
            setMapCenter([fetchedCoordinates.lat, fetchedCoordinates.lng]);
            setMapZoom(15);
        } else {
             console.warn("Geocoding failed.");
             // Decide if you want to stop here or continue
             // For now, we'll let it continue but Land Reg/Demo might fail
        }

        // --- 2. Fetch Land Registry and Demographics Concurrently ---
        const landRegistryPromise = fetchPropertyDataByPostcode(query)
            .then(apiData => formatTransactionData(apiData))
            .catch(err => {
                console.error("Land Registry Fetch/Format Error:", err);
                landRegistryError = err.message || "Failed to fetch property data.";
                return []; // Return empty array on error
            });

        const demographicsPromise = fetchDemographicData(query)
             .catch(err => {
                 console.error("Demographics Fetch Error:", err);
                 demoError = err.message || "Failed to fetch demographic data.";
                 return null; // Return null on error
             });

        // Wait for both fetches to complete
        const [transactions, demographicsResult] = await Promise.all([
            landRegistryPromise,
            demographicsPromise
        ]);

        landRegistryTransactions = transactions;
        fetchedDemographics = demographicsResult; // Store result (could be null)
        setDemographicsError(demoError); // Store specific error
        setDemographicData(fetchedDemographics); // Store fetched data (or null)


        // --- 3. Process Land Registry Results (if any) ---
        if (landRegistryTransactions.length > 0) {
            const priceGrowthMetrics = calculatePriceGrowth(landRegistryTransactions);
            const averagePrice = landRegistryTransactions.reduce((sum, t) => sum + t.price, 0) / landRegistryTransactions.length;

            // Generate Heatmap
             if (fetchedCoordinates) {
                 const prices = landRegistryTransactions.map(t => t.price);
                 const minPrice = Math.min(...prices);
                 const maxPrice = Math.max(...prices);
                 const priceRange = maxPrice - minPrice;
                 const points = landRegistryTransactions.map(t => {
                     let intensity = priceRange > 0 ? 0.1 + 0.9 * ((t.price - minPrice) / priceRange) : 0.5;
                     intensity = Math.max(0.1, Math.min(1.0, intensity));
                     const randomOffsetLat = (Math.random() - 0.5) * 0.004;
                     const randomOffsetLng = (Math.random() - 0.5) * 0.004;
                     return [fetchedCoordinates.lat + randomOffsetLat, fetchedCoordinates.lng + randomOffsetLng, intensity];
                 });
                 setHeatmapPoints(points);
             }

            // Create Search Summary
            const latestTransaction = landRegistryTransactions[0];
            const locationName = fetchedCoordinates?.town || latestTransaction.town || query.toUpperCase();
            const searchSummary = {
              id: `search-${query.replace(/\s/g, "")}`,
              title: `Area Overview: ${query.toUpperCase()}`,
              location: locationName,
              postcode: query.toUpperCase(),
              coordinates: fetchedCoordinates ? [fetchedCoordinates.lat, fetchedCoordinates.lng] : null,
              details: { bedrooms: 'N/A', bathrooms: 'N/A', sqft: 'N/A', age: 'N/A' },
              price: {
                asking: 'N/A',
                estimated: `£${Math.round(averagePrice).toLocaleString()}`,
                roi: priceGrowthMetrics.annualizedReturn,
                rentalYield: "No result",
              },
              amenities: [], transport: [], schools: [],
              riskScore: "No result",
              image: `https://placehold.co/600x400/e0f7fa/00796b?text=${query.toUpperCase()}+Overview`,
              transactionHistory: landRegistryTransactions,
              priceGrowth: priceGrowthMetrics,
              // --- Attach demographic data to the selected property ---
              demographicData: fetchedDemographics // Attach the full demo object
            };
            setSelectedProperty(searchSummary);
            setView("detail");
            setSearchResults({ success: true });

        } else {
             // No Land Registry data found
             setSearchResults({ errorMessage: landRegistryError || "No transaction data found." });
             // Still show detail view if *demographics* were found?
             if (fetchedDemographics) {
                 // Create a minimal summary object focused on demographics
                 const locationName = fetchedCoordinates?.town || query.toUpperCase();
                 const demoSummary = {
                     id: `search-${query.replace(/\s/g, "")}`,
                     title: `Area Overview: ${query.toUpperCase()}`,
                     location: locationName,
                     postcode: query.toUpperCase(),
                     coordinates: fetchedCoordinates ? [fetchedCoordinates.lat, fetchedCoordinates.lng] : null,
                     details: { bedrooms: 'N/A', bathrooms: 'N/A', sqft: 'N/A', age: 'N/A' },
                     price: { asking: 'N/A', estimated: 'N/A', roi: 'N/A', rentalYield: 'N/A' },
                     amenities: [], transport: [], schools: [], riskScore: "No result",
                     image: `https://placehold.co/600x400/e0f7fa/00796b?text=${query.toUpperCase()}+Overview`,
                     transactionHistory: [], // Empty history
                     priceGrowth: { growth: "No result", annualizedReturn: "No result" },
                     demographicData: fetchedDemographics
                 };
                 setSelectedProperty(demoSummary);
                 setView("detail");
                  setSearchResults(null); // Clear LR error message if showing demo data
             }
        }

    } catch (error) {
      // Catch errors from geocoding or Promise.all itself
      console.error("Error during overall search execution:", error);
      setSearchResults({ errorMessage: `Search failed: ${error.message || 'Please try again.'}` });
    } finally {
      setIsSearching(false);
      setIsFetchingDemographics(false); // Finish fetching demographics
    }
  }, [searchQuery]); // Add searchQuery to dependency array

   // --- View Handlers (minor change to clear demographics) ---
   const handleViewProperty = useCallback((property) => {
        setSelectedProperty(property);
        setView("detail");
        setHeatmapPoints([]);
        setDemographicData(null); // Clear area demographics when viewing featured
        setDemographicsError(null);

    if (property.coordinates) {
      setMapCenter(property.coordinates);
      setMapZoom(16); // Zoom closer for specific property
    } else {
        // Maybe try to geocode the postcode if coordinates are missing?
        console.warn("Featured property missing coordinates.");
        // Or reset to default view
         // setMapCenter([51.505, -0.09]);
         // setMapZoom(12);
    }
  }, []); // No dependencies needed if 'properties' array is stable

  const handleBackToListings = useCallback(() => {
        setSelectedProperty(null);
        setView("listings");
        setSearchResults(null);
        setHeatmapPoints([]);
        setDemographicData(null); // Clear demographics on back
        setDemographicsError(null);

    // Optionally reset map view or keep last search view
    // setMapCenter([51.505, -0.09]);
    // setMapZoom(12);
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
                    disabled={isSearching || isFetchingDemographics} // Disable while either is loading
                />
                <button type="submit" disabled={isSearching || isFetchingDemographics}>
                    {(isSearching || isFetchingDemographics) ? "Searching..." : "Search"}
                </button>
            </form>

          {/* Display Search Errors/Status */}
          {view === 'listings' && searchResults?.errorMessage && (
                <div className="search-status error-message">
                    <p>{searchResults.errorMessage}</p>
                </div>
            )}
             {/* Display Demographic Fetch Error if relevant */}
             {view === 'listings' && demographicsError && !searchResults?.errorMessage && (
                  <div className="search-status error-message">
                     <p>Demographics: {demographicsError}</p>
                  </div>
             )}
            {(isSearching || isFetchingDemographics) && (
                <div className="search-status info-message">
                    <p>Loading data... {(isSearching && isFetchingDemographics) ? '(Property & Demographics)' : (isSearching ? '(Property)' : '(Demographics)')}</p>
                </div>
            )}

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="map-container"
            scrollWheelZoom={true} // Enable scroll wheel zoom
          >
            {/* Use a different base map - CartoDB Positron is clean */}
             <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {/* Component to handle map view changes */}
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Render Heatmap if points exist */}
            {heatmapPoints && heatmapPoints.length > 0 && (
                 <HeatmapLayer data={heatmapPoints} />
            )}

            {/* Markers for Featured Properties (only in listings view?) */}
            {view === 'listings' && properties.map((property) => (
              property.coordinates && // Only render if coordinates exist
              <Marker
                key={`featured-${property.id}`}
                position={property.coordinates}
              >
                 <Popup>
                    <b>{property.title}</b><br/>
                    {property.price?.asking || 'Price N/A'}<br/>
                    <button onClick={() => handleViewProperty(property)} className="popup-button">View Details</button>
                 </Popup>
              </Marker>
            ))}

            {/* Marker for Selected Property/Area Center (in detail view) */}
            {view === 'detail' && selectedProperty && selectedProperty.coordinates && (
               <Marker
                    key={selectedProperty.id}
                    position={selectedProperty.coordinates}
                    // Optionally use a different icon for the selected item
               >
                 <Popup>
                    <b>{selectedProperty.title}</b><br/>
                    {selectedProperty.price?.estimated !== 'N/A'
                        ? `Avg Price: ${selectedProperty.price.estimated}`
                        : (selectedProperty.price?.asking || '')}
                 </Popup>
               </Marker>
            )}
          </MapContainer>
        </div>

        {/* --- Right Panel: Listings or Details --- */}
        <div className="property-panel">
           {view === 'detail' && selectedProperty ? (
             // Pass demographic loading/error state if needed for finer control
             <PropertyDetail
               property={selectedProperty}
               // Pass down demographic state
               demographicData={selectedProperty.demographicData || demographicData} // Use attached data first
               isFetchingDemographics={isFetchingDemographics}
               demographicsError={demographicsError}
               onBackToListings={handleBackToListings}
             />
           ) : (
            // Show Listings View
            <>
              <h2>Featured Properties</h2>
              {/* Optional: Message if no featured properties defined */}
              {properties.length === 0 && <p>No featured properties to display.</p>}

              <div className="property-list">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onViewProperty={() => handleViewProperty(property)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;