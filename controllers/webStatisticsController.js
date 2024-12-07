const axios = require("axios");
const now = new Date(); // Current date and time
const endDate = now.toISOString().split("T")[0]; // Remove the Z
const startDate = new Date(now.setDate(now.getDate() - 30))
  .toISOString()
  .split("T")[0];

console.log("now time:", now, "end date:", endDate, "start Date:", startDate);
const Last30Days = async (req, res) => {
  try {
    //  `https://checkstat.net/includes/statistics/get_chart_statistics.php?site_id=911&start_date=${startDate}&end_date=${endDate}&onlyUnique=false&activity=null&limit=300

    const response = await axios.get(
      `https://checkstat.net/includes/statistics/get_chart_statistics.php?site_id=911&start_date=${startDate}T00:00:00+03:00&end_date=${endDate}T23:59:59+02:00&onlyUnique=false&activity=null&limit=300`
    );

    if (response.status !== 200 || !response.data) {
      return res
        .status(404)
        .json({ error: "No data found. Please try again." });
    }

    res.json(response.data);
  } catch (error) {
    console.error(
      "Failed to retrieve last 30 days visits: ",
      error.message || error
    );
    res
      .status(500)
      .json({ error: "Failed to retrieve web visitors for the last 30 days." });
  }
};

const DeviceType = async (req, res) => {
  try {
    const response = await axios.get(
      `https://checkstat.net/includes/statistics/get_device_statistics.php?site_id=911&start_date=${startDate}T00:00:00+03:00&end_date=${endDate}T23:59:59+02:00&onlyUnique=false&activity=null&limit=8`
    );

    if (response.status !== 200 || !response.data) {
      return res
        .status(404)
        .json({ error: "No data found. Please try again." });
    }

    res.json(response.data);
  } catch (error) {
    console.error(
      "Failed to retrieve device type data: ",
      error.message || error
    );
    res
      .status(500)
      .json({ error: "Failed to retrieve web visitors for device type." });
  }
};

const userCountry = async (req, res) => {
  try {
    const response = await axios.get(
      `https://checkstat.net/includes/statistics/get_country_statistics.php?site_id=911&start_date=${startDate}T00:00:00+03:00&end_date=${endDate}T23:59:59+02:00&onlyUnique=false&activity=null&limit=300`
    );

    if (response.status !== 200 || !response.data) {
      return res
        .status(404)
        .json({ error: "No data found. Please try again." });
    }

    res.json(response.data);
  } catch (error) {
    console.error(
      "Failed to retrieve user country data: ",
      error.message || error
    );
    res
      .status(500)
      .json({ error: "Failed to retrieve web visitor's countries." });
  }
};

module.exports = { Last30Days, DeviceType, userCountry };
