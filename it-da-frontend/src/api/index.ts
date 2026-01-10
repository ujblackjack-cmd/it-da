import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const { data } = await apiClient.post("/users/login", credentials);
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  },

  signup: async (signupData: {
    email: string;
    password: string;
    username: string;
    address: string;
    nickname?: string;
    phone?: string;
    preferences?: {
      energyType: string;
      purposeType: string;
      frequencyType: string;
      locationType: string;
      budgetType: string;
      leadershipType: string;
      timePreference: string;
    };
  }) => {
    const { data } = await apiClient.post("/users/signup", signupData);
    return data;
  },

  logout: async () => {
    await apiClient.post("/users/logout");
    localStorage.removeItem("user");
  },

  me: async () => {
    const { data } = await apiClient.get("/users/me");
    return { user: data };
  },
};

export default apiClient;
