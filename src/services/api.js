import axios from "axios";

const api = axios.create({
  baseURL: "https://nuevoejido.bsite.net/api",
});

export default api;