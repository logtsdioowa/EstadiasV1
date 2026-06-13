import axios from "axios";

const api = axios.create({
  baseURL: "http://nuevoejido.runasp.net/api",
});

export default api;
