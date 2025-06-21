// src/services/apiClient.ts
import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { ElMessage } from "element-plus"; // For global error messages

// Get base URL from Vite environment variables (defined in .env)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Request Interceptor (e.g., for adding Auth tokens)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // const token = localStorage.getItem('authToken'); // Example: get token from storage
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (e.g., for global error handling)
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response.data; // Usually, we only care about the data property
  },
  (error: AxiosError<any>) => {
    // Type the error if you have a common error response schema
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    let errorMessage = "An unexpected error occurred";

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("API Error Response:", error.response);
      if (error.response.data && error.response.data.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation errors
          errorMessage = error.response.data.detail
            .map((e: any) => `${e.loc.join(".")} - ${e.msg}`)
            .join("; ");
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response.statusText) {
        errorMessage = `${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API No Response:", error.request);
      errorMessage =
        "No response from server. Please check your network connection.";
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API Request Setup Error:", error.message);
      errorMessage = error.message;
    }

    ElMessage({
      message: errorMessage,
      type: "error",
      duration: 5 * 1000,
    });

    return Promise.reject(error); // Important to reject so calling code can catch it
  }
);

export default apiClient;
