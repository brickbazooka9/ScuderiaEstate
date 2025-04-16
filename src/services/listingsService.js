// src/services/listingsService.js (NEW FILE)
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

/**
 * Fetch scraped listings for a given postcode via the backend proxy.
 * @param {string} postcode - The UK postcode.
 * @returns {Promise<Array>} - An array of scraped listing objects.
 * @throws {Error} If the fetch fails or the proxy returns an error status.
 */
export const fetchScrapedListings = async (postcode) => {
  const proxyUrl = `${API_BASE_URL}/api/scrape-listings?postcode=${encodeURIComponent(
    postcode.trim()
  )}`;

  console.log(`Fetching Scraped Listings via proxy: ${proxyUrl}`);

  try {
    const response = await fetch(proxyUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error ||
        `Listings scrape failed: ${response.status} ${response.statusText}`;
      console.error(`Proxy listings scrape failed: ${response.status}`, data);
      throw new Error(errorMessage);
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.error(
        "Scraped listings data received from proxy is not an array:",
        data
      );
      throw new Error("Received invalid data format for listings.");
    }

    console.log(`Scraped listings received from proxy: ${data.length} items`);
    return data; // Return the array of listing objects
  } catch (error) {
    console.error("Error fetching scraped listings via proxy:", error);
    // Try to pass specific error message if possible
    throw new Error(
      error.message.includes("invalid data format")
        ? error.message
        : `Failed to fetch listings: ${error.message}`
    );
  }
};
