import axios from "axios";

const API_BASE = "http://localhost:3000/api/v1";

export function useSolarApi() {
  const client = axios.create({
    baseURL: API_BASE,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const initiateScan = (data) => {
    return client.post("/customer", data);
  };

  const getScanStatus = (jobId) => {
    return client.get(`/customer/${jobId}/status`);
  };

  const getScanResults = (jobId) => {
    return client.get(`/customer/${jobId}/results`);
  };

  return {
    initiateScan,
    getScanStatus,
    getScanResults,
  };
}
