import axios from "axios";

const api = axios.create({
  baseURL: "https://nuevoejido.runasp.net/api",
  timeout: 15000,
});

export default api;