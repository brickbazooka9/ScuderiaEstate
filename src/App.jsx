import React, { useState, useEffect } from "react";
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "./components/HeatmapLayer";
import PropertyCard from "./components/PropertyCard";
import PropertyDetail from "./components/PropertyDetail";
import { calculatePriceGrowth } from "./services/landRegistryService";

// MapController component to update map view
function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [view, setView] = useState("listings"); // 'listings' or 'detail'
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default London center
  const [mapZoom, setMapZoom] = useState(13);
  const [transactionData, setTransactionData] = useState([]);

  // Sample property data
  const properties = [
    {
      id: 1,
      title: "Modern Apartment in Chelsea",
      location: "Chelsea, London",
      postcode: "SW3 5RZ", // Example postcode
      coordinates: [51.49, -0.17], // Example coordinates for Chelsea
      details: {
        bedrooms: 2,
        bathrooms: 2,
        sqft: 950,
        age: 5,
      },
      price: {
        asking: "£850,000",
        estimated: "£875,000",
        roi: "7.2%",
        rentalYield: "3.4%",
      },
      amenities: ["Gym", "Concierge", "Parking"],
      transport: [
        { name: "Sloane Square Station", distance: "0.3mi" },
        { name: "South Kensington", distance: "0.5mi" },
      ],
      schools: [
        "Chelsea Primary School",
        "Kensington Academy",
        "Royal College",
      ],
      riskScore: "2/5",
      image:
        "https://placehold.co/600x400/e9e9e9/1d1d1d?text=Chelsea+Apartment",
    },
    {
      id: 2,
      title: "Stylish Loft in Kensington",
      location: "Kensington, London",
      postcode: "W8 7BU", // Example postcode
      coordinates: [51.5, -0.19], // Example coordinates for Kensington
      details: {
        bedrooms: 3,
        bathrooms: 3,
        sqft: 1100,
        age: 3,
      },
      price: {
        asking: "£950,000",
        estimated: "£1,000,000",
        roi: "8.5%",
        rentalYield: "4.2%",
      },
      amenities: ["Fitness Center", "Doorman", "Garage"],
      transport: [
        { name: "Kensington High Street Station", distance: "0.2mi" },
        { name: "Gloucester Road", distance: "0.4mi" },
      ],
      schools: [
        "Kensington Primary",
        "Holland Park School",
        "Imperial College London",
      ],
      riskScore: "1/5",
      image: "https://placehold.co/600x400/e9e9e9/1d1d1d?text=Kensington+Loft",
    },
  ];

  // Sample heatmap data (would be replaced with real data)
  const heatmapData = {
    data: [
      [51.505, -0.09, 0.8], // [lat, lng, intensity]
      [51.51, -0.1, 0.6],
      [51.51, -0.12, 0.4],
      [51.52, -0.11, 0.9],
      [51.52, -0.13, 0.3],
      [51.51, -0.14, 0.7],
      [51.5, -0.12, 0.5],
      [51.49, -0.1, 0.4],
      [51.48, -0.11, 0.6],
      [51.47, -0.13, 0.2],
      [51.485, -0.14, 0.3],
      [51.49, -0.15, 0.5],
    ],
    radius: 20,
    blur: 15,
    gradient: { 0.4: "blue", 0.6: "lime", 0.8: "yellow", 1.0: "red" },
  };

  // UK Postcode to Lat/Lng API (simplified version)
  const postcodeToCoordinates = async (postcode) => {
    try {
      // This would normally be a real API call to a geocoding service
      // For demonstration, we'll use a simple mapping for the example postcodes
      if (postcode.replace(/\s/g, "").toUpperCase() === "SW35RZ") {
        return { lat: 51.49, lng: -0.17 }; // Chelsea coordinates
      } else if (postcode.replace(/\s/g, "").toUpperCase() === "W87BU") {
        return { lat: 51.5, lng: -0.19 }; // Kensington coordinates
      } else {
        // For any other postcode, we'll use a simple approximation
        // In a real app, you would use a geocoding API
        return { lat: 51.51, lng: -0.13 }; // Central London as fallback
      }
    } catch (error) {
      console.error("Error converting postcode to coordinates:", error);
      return null;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    // Check if the search query is a postcode
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

    if (!searchQuery) return;

    setIsSearching(true);

    try {
      if (postcodeRegex.test(searchQuery)) {
        // Format the postcode for the API call
        const formattedPostcode = searchQuery.replace(/\s/g, "+");
        const apiUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${formattedPostcode}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data && data.result && data.result.items) {
          // Extract and format transactions
          const transactions = data.result.items.map((item) => ({
            id: item.transactionId,
            date: new Date(item.transactionDate),
            price: item.pricePaid,
            address: `${item.propertyAddress.paon} ${item.propertyAddress.street}`,
            town: item.propertyAddress.town,
            postcode: item.propertyAddress.postcode,
            propertyType:
              item.propertyType?.prefLabel?.[0]?._value || "Unknown",
            isNewBuild: item.newBuild,
          }));

          // Sort by date (newest first)
          transactions.sort((a, b) => b.date - a.date);

          // Calculate price metrics
          const priceGrowthMetrics = calculatePriceGrowth(transactions);

          // Calculate average price
          const totalPrice = transactions.reduce(
            (sum, transaction) => sum + transaction.price,
            0
          );
          const averagePrice =
            transactions.length > 0 ? totalPrice / transactions.length : 0;

          setTransactionData(transactions);

          // Create a search result property
          if (transactions.length > 0) {
            const latestTransaction = transactions[0];
            const searchProperty = {
              id: "search-result",
              title: `Property in ${searchQuery}`,
              location: latestTransaction.town || "Unknown Location",
              postcode: searchQuery,
              details: {
                bedrooms: "-",
                bathrooms: "-",
                sqft: "-",
                age: "-",
              },
              price: {
                asking: `£${latestTransaction.price.toLocaleString()}`,
                estimated: `£${Math.round(averagePrice).toLocaleString()}`,
                roi: priceGrowthMetrics.annualizedReturn || "Unknown",
                rentalYield: "Data not available",
              },
              amenities: [],
              transport: [],
              schools: [],
              riskScore: "Data not available",
              image:
                "https://placehold.co/600x400/e9e9e9/1d1d1d?text=Property+Found",
              transactionHistory: transactions,
            };

            setSelectedProperty(searchProperty);
            setView("detail");
          }

          setSearchResults({
            transactions,
            averagePrice,
            postcode: searchQuery,
            priceGrowth: priceGrowthMetrics,
          });

          // Update map position to searched postcode
          const coordinates = await postcodeToCoordinates(searchQuery);
          if (coordinates) {
            setMapCenter([coordinates.lat, coordinates.lng]);
            setMapZoom(15); // Zoom in closer
          }
        } else {
          setSearchResults({
            transactions: [],
            postcode: searchQuery,
            errorMessage: "No data found for this postcode.",
          });
        }
      } else {
        // Handle regular address search (e.g., displaying a message that only postcode search is supported)
        setSearchResults({
          transactions: [],
          errorMessage: "Please enter a valid UK postcode for search.",
        });
      }
    } catch (error) {
      console.error("Error searching:", error);
      setSearchResults({
        transactions: [],
        errorMessage: "An error occurred while searching. Please try again.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProperty = (property) => {
    setSelectedProperty(property);
    setView("detail");

    // If property has coordinates, update map center
    if (property.coordinates) {
      setMapCenter(property.coordinates);
      setMapZoom(15);
    }
  };

  const handleBackToListings = () => {
    setSelectedProperty(null);
    setView("listings");
    setMapCenter([51.505, -0.09]); // Reset to default London view
    setMapZoom(13);
  };

  return (
    <div className="App">
      <div className="app-container">
        <div className="map-panel">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for a postcode (e.g., SW3 5RZ)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchResults && searchResults.errorMessage && (
            <div className="search-results">
              <p className="error-message">{searchResults.errorMessage}</p>
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="map-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            <HeatmapLayer {...heatmapData} />
            {properties.map((property) => (
              <Marker
                key={property.id}
                position={property.coordinates || mapCenter}
              >
                <Popup>{property.title}</Popup>
              </Marker>
            ))}

            {selectedProperty && selectedProperty.coordinates && (
              <Marker position={selectedProperty.coordinates} opacity={1}>
                <Popup>{selectedProperty.title}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="property-panel">
          {view === "listings" ? (
            <>
              <h2>Featured Properties</h2>
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
          ) : (
            <PropertyDetail
              property={selectedProperty}
              transactionData={transactionData}
              onBackToListings={handleBackToListings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
