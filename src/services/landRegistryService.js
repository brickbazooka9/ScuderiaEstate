/**
 * Fetch property transaction data from Land Registry API by postcode
 * @param {string} postcode - UK postcode to search for
 * @returns {Promise<Object>} - Raw API response
 */
export const fetchPropertyDataByPostcode = async (postcode) => {
  try {
    // Format the postcode for the API call
    const formattedPostcode = postcode.replace(/\s/g, "+");
    const apiUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${formattedPostcode}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching property data:", error);
    throw error;
  }
};

/**
 * Format transaction data from Land Registry API
 * @param {Object} apiData - Raw API response
 * @returns {Array} - Formatted transaction data
 */
export const formatTransactionData = (apiData) => {
  if (!apiData || !apiData.result || !apiData.result.items) {
    return [];
  }

  // Extract and format transactions
  const transactions = apiData.result.items.map((item) => ({
    id: item.transactionId,
    date: new Date(item.transactionDate),
    price: item.pricePaid,
    address: `${item.propertyAddress.paon} ${item.propertyAddress.street}`,
    town: item.propertyAddress.town,
    postcode: item.propertyAddress.postcode,
    propertyType: item.propertyType?.prefLabel?.[0]?._value || "Unknown",
  }));

  // Sort by date (newest first)
  return transactions.sort((a, b) => b.date - a.date);
};

/**
 * Calculate price growth metrics from transaction data
 * @param {Array} transactions - Formatted transaction data
 * @returns {Object} - Price growth metrics
 */
export const calculatePriceGrowth = (transactions) => {
  if (!transactions || transactions.length < 2) {
    return {
      priceRange: { min: 0, max: 0 },
      growth: "Not enough data",
      annualizedReturn: "Not enough data",
    };
  }

  // Sort by date (oldest first for calculations)
  const sortedTransactions = [...transactions].sort((a, b) => a.date - b.date);

  // Find min and max prices
  const prices = sortedTransactions.map((t) => t.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Calculate total growth
  const firstTransaction = sortedTransactions[0];
  const latestTransaction = sortedTransactions[sortedTransactions.length - 1];

  const priceChange = latestTransaction.price - firstTransaction.price;
  const percentageChange = (priceChange / firstTransaction.price) * 100;

  // Calculate time between first and last transaction (in years)
  const timeDiffMs = latestTransaction.date - firstTransaction.date;
  const yearsDiff = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);

  // Calculate annualized return
  // Formula: (Final Value / Initial Value)^(1/n) - 1
  const annualizedReturn =
    yearsDiff > 0
      ? (Math.pow(
          latestTransaction.price / firstTransaction.price,
          1 / yearsDiff
        ) -
          1) *
        100
      : 0;

  return {
    priceRange: {
      min: minPrice,
      max: maxPrice,
    },
    growth: `${percentageChange.toFixed(1)}% over ${yearsDiff.toFixed(
      1
    )} years`,
    annualizedReturn: `${annualizedReturn.toFixed(1)}% per year`,
  };
};
