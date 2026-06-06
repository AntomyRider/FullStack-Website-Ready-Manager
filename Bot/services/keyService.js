const axios = require("axios");
const { API_URL } = require("../config");

async function checkKey(key, discordId) {
  try {
    const res = await axios.post(`${API_URL}/licenses/claim`, {
      key,
      discordId,
    });
    return res.data.success === true;
  } catch (err) {
    if (err.response) {
      console.log(`[API] Status: ${err.response.status} | Key: ${key}`);
      return false;
    }
    throw err;
  }
}

async function checkKeyReset(key, discordId) {
  try {
    const res = await axios.post(`${API_URL}/licenses/reset-hwid`, {
      key,
      discordId,
    });
    return res.data;
  } catch (err) {
    if (err.response) {
      const { data, status } = err.response;
      console.log(`[RESET API] Status: ${status} | Code: ${data?.code} | Key: ${key}`);

      const error = new Error(data?.message || "Unknown error");
      error.code     = data?.code ?? null;
      error.cooldown = data?.cooldown ?? null;
      throw error;
    }
    throw err;
  }
}

module.exports = {
  checkKey,
  checkKeyReset,
};
