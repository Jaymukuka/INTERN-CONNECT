import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Add timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post("/login", { email, password }),
  register: (userData) => api.post("/register", userData),
};

export const jobsAPI = {
  getAll: () => api.get("/jobs"),
  getRecommended: () => api.get("/jobs/recommended"),
  create: (jobData) => api.post("/jobs", jobData),
  getById: (id) => api.get(`/jobs/${id}`),
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  delete: (id) => api.delete(`/jobs/${id}`),
};

export const applicationsAPI = {
  apply: (jobId, coverLetter) =>
    api.post("/applications", { jobId, coverLetter }),
  getStudentApplications: () => api.get("/applications/student"),
  getRecruiterApplications: () => api.get("/applications/recruiter"),
  getRankedApplicants: (jobId) =>
    api.get(`/applications/recruiter/${jobId}/ranked`),
  updateStatus: (applicationId, status) =>
    api.put(`/applications/${applicationId}/status`, { status }),
  getApplicationById: (applicationId) =>
    api.get(`/applications/${applicationId}`),
};

export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (profile) => api.put("/users/profile", { profile }),
  uploadResume: (formData) =>
    api.post("/users/upload-resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// Complete Admin API Endpoints
export const adminAPI = {
  // Statistics
  getStats: () => api.get("/admin/stats"),

  // Users Management
  getUsers: () => api.get("/admin/users"),
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Jobs Management
  getJobs: () => api.get("/admin/jobs"),
  deleteJob: (jobId) => api.delete(`/admin/jobs/${jobId}`),
  updateJob: (jobId, jobData) => api.put(`/admin/jobs/${jobId}`, jobData),

  // Applications Management
  getApplications: () => api.get("/admin/applications"),
  updateApplication: (applicationId, applicationData) =>
    api.put(`/admin/applications/${applicationId}`, applicationData),
  deleteApplication: (applicationId) =>
    api.delete(`/admin/applications/${applicationId}`),
};

export default api;
