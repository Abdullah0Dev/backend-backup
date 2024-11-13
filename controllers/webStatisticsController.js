const axios = require("axios");

const Last30Days = async (req, res) => {
  try {
    const response = await axios.get(
      "https://checkstat.net/includes/statistics/get_chart_statistics.php?site_id=911&start_date=2024-10-11T00:00:00+03:00&end_date=2024-11-09T23:59:59+02:00&onlyUnique=false&activity=null&limit=300"
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
      "https://checkstat.net/includes/statistics/get_device_statistics.php?site_id=911&start_date=2024-10-12T00:00:00+03:00&end_date=2024-11-10T23:59:59+02:00&onlyUnique=false&activity=null&limit=8"
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
      "https://checkstat.net/includes/statistics/get_country_statistics.php?site_id=911&start_date=2024-10-12T00:00:00+03:00&end_date=2024-11-10T23:59:59+02:00&onlyUnique=false&activity=null&limit=300"
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
