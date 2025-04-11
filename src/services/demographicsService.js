// src/services/demographicsService.js

/**
 * Fetches demographic data for a given postcode via the backend proxy.
 * @param {string} postcode - The UK postcode.
 * @returns {Promise<Object>} - The aggregated demographic data object from the proxy.
 * @throws {Error} If the fetch fails or the proxy returns an error status.
 */
export const fetchDemographicData = async (postcode) => {
    const proxyBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
    const proxyUrl = `${proxyBaseUrl}/api/demographics?postcode=${encodeURIComponent(postcode.trim())}`;

    console.log(`Fetching Demographic data via proxy: ${proxyUrl}`);

    try {
        const response = await fetch(proxyUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.error || `Demographics fetch failed: ${response.status} ${response.statusText}`;
            console.error(`Proxy demographics fetch failed: ${response.status}`, data);
            throw new Error(errorMessage);
        }

        console.log("Demographic data received from proxy:", data);
        return data; // Return the whole structure { postcode, geoCodes, demographics, fetchErrors }

    } catch (error) {
        console.error("Error fetching demographic data via proxy:", error);
        throw new Error(error.message || "Network error fetching demographics.");
    }
};