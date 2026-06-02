import axios from "axios";

const api = axios.create({
  baseURL: "https://elnuevoejido.bsite.net/api",
});

export default api;