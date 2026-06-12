import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:44303/api",
});

export default api;