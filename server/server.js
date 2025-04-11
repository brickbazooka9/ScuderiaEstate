// server/server.js
require("dotenv").config(); // Load environment variables if needed later
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.REACT_APP_PROXY_PORT || 3001; // Use port 3001 unless specified elsewere

// Configure CORS
// Allow requests specifically from your React app's origin
const corsOptions = {
  origin: process.env.REACT_APP_CLIENT_URL || "http://localhost:3000",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Optional: Middleware to parse JSON request bodies (if you send data in POST requests later)
// app.use(express.json());

// --- API Proxy Endpoint ---
app.get("/api/land-registry", async (req, res) => {
  const { postcode } = req.query; // Get postcode from query param ?postcode=XYZ

  if (!postcode) {
    return res
      .status(400)
      .json({ error: "Postcode query parameter is required." });
  }

  // Basic postcode validation (you can enhance this)
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  if (!postcodeRegex.test(postcode)) {
    return res
      .status(400)
      .json({ error: "Invalid UK postcode format provided." });
  }

  // --- Prepare postcode for Land Registry API ---
  // Trim, uppercase, and REMOVE spaces - this often works better for APIs
  const formattedPostcode = postcode.trim().toUpperCase();
  const itemsPerPage = 500; // Keep limit
  const targetUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encodeURIComponent(
    formattedPostcode
  )}`;
  console.log(`[Proxy] Received request for postcode: ${postcode}`);
  // The logged URL should now show %20 for the space if the input had one
  console.log(`[Proxy] Forwarding request to: ${targetUrl}`);

  // ^^ Note: Still using encodeURIComponent for safety, even after removing space.

  console.log(`[Proxy] Received request for postcode: ${postcode}`);
  console.log(`[Proxy] Forwarding request to: ${targetUrl}`);

  try {
    const apiResponse = await axios.get(targetUrl, {
      headers: {
        Accept: "application/json",
        // Add any other headers the Land Registry API might require if needed
        // 'User-Agent': 'YourRealEstateApp/1.0 (contact@yourapp.com)' // Good practice
      },
      // Important: Set timeout to prevent hanging indefinitely
      timeout: 15000, // 15 seconds timeout
    });

    console.log(
      `[Proxy] Land Registry API responded with status: ${apiResponse.status}`
    );
    // Forward the successful response data from Land Registry back to the React app
    res.status(apiResponse.status).json(apiResponse.data);
  } catch (error) {
    console.error(
      "[Proxy] Error fetching data from Land Registry API:",
      error.message
    );

    // Handle specific error types from Axios
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(
        "[Proxy] Land Registry Error Status:",
        error.response.status
      );
      console.error("[Proxy] Land Registry Error Data:", error.response.data);
      // Forward the error status and data from Land Registry
      res.status(error.response.status).json({
        error: `Land Registry API error: ${error.response.status}`,
        details: error.response.data, // Forward details if available
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error(
        "[Proxy] No response received from Land Registry:",
        error.request
      );
      res
        .status(504)
        .json({
          error:
            "No response received from Land Registry API (Gateway Timeout).",
        });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(
        "[Proxy] Error setting up Land Registry request:",
        error.message
      );
      res
        .status(500)
        .json({
          error: "Internal server error while contacting Land Registry API.",
        });
    }
  }
});

// --- Basic Root Route (optional, for testing) ---
app.get("/", (req, res) => {
  res.send("Real Estate App Proxy Server is running!");
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`[Proxy] Server listening on port ${PORT}`);
  console.log(`[Proxy] Allowing requests from: ${corsOptions.origin}`);
});
