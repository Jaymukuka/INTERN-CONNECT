import React, { useState, useEffect } from "react";
import StudentDashboard from "./components/StudentDashboard";
import RecruiterDashboard from "./components/RecruiterDashboard";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import { authAPI, jobsAPI, applicationsAPI, userAPI } from "./services/api";
import "./App.css";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState("student");
  const [theme, setTheme] = useState("light");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [removedApplicationIds, setRemovedApplicationIds] = useState([]); // local-only removals

  useEffect(() => {
    const savedTheme = localStorage.getItem("intern-connect-theme");
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    // Auto-login if token exists
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setUserType(user.type);
        // load per-user removed application ids (local-only)
        try {
          const removedRaw = localStorage.getItem(`removedApps_${user.id}`);
          const removed = removedRaw ? JSON.parse(removedRaw) : [];
          if (Array.isArray(removed))
            setRemovedApplicationIds(removed.map((id) => String(id)));
        } catch (e) {
          console.warn("Could not parse removedApps for user", e);
        }
      } catch (error) {
        console.error("Error parsing saved user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // This will reload data when currentUser changes OR when refreshTrigger changes
  useEffect(() => {
    if (currentUser) {
      loadInitialData();
    }
  }, [currentUser, refreshTrigger]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log("Loading initial data...");

      // Load jobs - students get recommended (ranked) jobs from server, others get all jobs
      let jobsResponse;
      if (currentUser?.type === "student") {
        try {
          jobsResponse = await jobsAPI.getRecommended();
          // API returns { jobs: [...] } - handle both wrapped and unwrapped formats
          const serverJobs = jobsResponse.data?.jobs || jobsResponse.data || [];
          console.log("Recommended jobs loaded:", serverJobs);
          setJobs(serverJobs);
        } catch (recError) {
          // If recommended endpoint fails (e.g., 401), fall back to regular jobs
          console.warn(
            "Recommended jobs failed, falling back to all jobs:",
            recError.message
          );
          jobsResponse = await jobsAPI.getAll();
          console.log("Jobs loaded (fallback):", jobsResponse.data);
          setJobs(jobsResponse.data || []);
        }
      } else {
        jobsResponse = await jobsAPI.getAll();
        console.log("Jobs loaded:", jobsResponse.data);
        setJobs(jobsResponse.data || []);
      }

      // Load applications based on user type
      if (currentUser?.type === "student") {
        const appsResponse = await applicationsAPI.getStudentApplications();
        console.log("Student applications loaded:", appsResponse.data);
        // filter out any locally-removed application ids (persisted per user)
        let removed = (removedApplicationIds || []).map((id) => String(id));
        if (!removed || removed.length === 0) {
          try {
            const raw = localStorage.getItem(`removedApps_${currentUser.id}`);
            removed = raw
              ? (JSON.parse(raw) || []).map((id) => String(id))
              : [];
          } catch (e) {
            removed = [];
          }
        }
        const filtered = (appsResponse.data || []).filter(
          (app) => !removed.includes(String(app.id))
        );
        setApplications(filtered);
      } else if (currentUser?.type === "organization") {
        const appsResponse = await applicationsAPI.getRecruiterApplications();
        console.log("Recruiter applications loaded:", appsResponse.data);
        // For recruiters, keep full list (don't apply student's removed list)
        setApplications(appsResponse.data || []);
      }
      // Admin doesn't need to load applications for dashboard

      setDataLoaded(true);
    } catch (error) {
      console.error("Error loading initial data:", error);
      setJobs([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Improved refetch function that triggers a re-render
  const refetchData = async () => {
    console.log("Refetching data...");
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogin = async (loginData) => {
    try {
      setLoading(true);
      const response = await authAPI.login(loginData.email, loginData.password);

      const { user, token } = response.data;

      // Store token and user data
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setCurrentUser(user);
      setUserType(user.type);

      return { success: true, message: "Login successful!" };
    } catch (error) {
      const message =
        error.response?.data?.error ||
        "Login failed. Please check your credentials.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);

      const { user, token } = response.data;

      // Store token and user data
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setCurrentUser(user);
      setUserType(user.type);

      return { success: true, message: "Registration successful!" };
    } catch (error) {
      const message =
        error.response?.data?.error || "Registration failed. Please try again.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (email, newPassword) => {
    return { success: true, message: "Password reset successful!" };
  };

  const updateUserProfile = async (userId, updatedProfile) => {
    try {
      const response = await userAPI.updateProfile(updatedProfile);
      const updatedUser = response.data.user;

      setCurrentUser(updatedUser);
      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return { success: true, message: "Profile updated successfully!" };
    } catch (error) {
      const message =
        error.response?.data?.error || "Failed to update profile.";
      return { success: false, message };
    }
  };

  const handleApply = async (studentId, jobId, coverLetter = "") => {
    try {
      console.log("Applying to job:", jobId);
      const response = await applicationsAPI.apply(jobId, coverLetter);
      const newApplication = response.data.application;

      console.log("New application created:", newApplication);

      // Update local applications state immediately
      setApplications((prev) => [...prev, newApplication]);

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("Application error:", error);
      const message =
        error.response?.data?.error || "Failed to submit application.";
      return { success: false, message };
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      console.log("Updating application status:", applicationId, newStatus);
      const response = await applicationsAPI.updateStatus(
        applicationId,
        newStatus
      );
      const updatedApplication = response.data.application;

      console.log("Application status updated:", updatedApplication);

      // Update local applications state immediately
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updatedApplication : app))
      );

      return { success: true, message: "Application status updated!" };
    } catch (error) {
      console.error("Status update error:", error);
      const message =
        error.response?.data?.error || "Failed to update application status.";
      return { success: false, message };
    }
  };

  const clearAttendedApplications = async () => {
    try {
      // Since we don't have a specific API for this, we'll filter locally
      const attendedApplications = applications.filter(
        (app) => app.status === "shortlisted" || app.status === "rejected"
      );

      setApplications((prev) => prev.filter((app) => app.status === "pending"));

      return { success: true, count: attendedApplications.length };
    } catch (error) {
      return { success: false, count: 0 };
    }
  };

  const createJob = async (jobData) => {
    try {
      console.log("Creating job:", jobData);
      const response = await jobsAPI.create(jobData);
      const newJob = response.data.job;

      console.log("New job created:", newJob);

      // Update local jobs state immediately
      setJobs((prev) => [...prev, newJob]);

      return { success: true, job: newJob, message: response.data.message };
    } catch (error) {
      console.error("Job creation error:", error);
      const message =
        error.response?.data?.error || "Failed to create job posting.";
      return { success: false, job: null, message };
    }
  };

  // remove application only from this student's view (local-only)
  const handleRemoveApplication = async (applicationId) => {
    try {
      const idStr = String(applicationId);
      // Add to local removed list and persist per user so refetch won't re-add it
      const updatedSet = new Set([
        ...(removedApplicationIds || []).map((id) => String(id)),
        idStr,
      ]);
      const updated = Array.from(updatedSet);
      setRemovedApplicationIds(updated);
      if (currentUser?.id) {
        try {
          localStorage.setItem(
            `removedApps_${currentUser.id}`,
            JSON.stringify(updated)
          );
        } catch (e) {
          console.warn("Failed to persist removedApps to localStorage", e);
        }
      }

      // Remove from current applications state so UI updates immediately
      setApplications((prev) => prev.filter((app) => String(app.id) !== idStr));

      return {
        success: true,
        message: "Application removed from your dashboard (local only)",
      };
    } catch (error) {
      console.error("Local remove application error:", error);
      // best-effort local removal
      setApplications((prev) =>
        prev.filter((app) => String(app.id) !== String(applicationId))
      );
      return { success: true, message: "Application removed locally" };
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Reset state
    setCurrentUser(null);
    setUserType("student");
    setJobs([]);
    setApplications([]);
    setDataLoaded(false);
    setRefreshTrigger(0);
    setRemovedApplicationIds([]); // clear local-only removals on logout
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("intern-connect-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleResumeUpload = async (userId, file) => {
    try {
      // Try server upload if API method exists
      if (userAPI && typeof userAPI.uploadResume === "function") {
        const formData = new FormData();
        formData.append("resume", file);
        // do not append userId unless backend expects it; keep it optional
        // formData.append('userId', userId)

        const response = await userAPI.uploadResume(formData);

        const resumeUrl =
          response?.data?.resumeUrl || response?.data?.url || null;
        if (resumeUrl) {
          const updatedUser = {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              resumeUrl,
              resumeName: file.name,
            },
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          return { success: true, message: "Resume uploaded successfully!" };
        }

        // If server returned but no URL, fall through to fallback below
        console.warn(
          "uploadResume returned no URL, falling back to local object URL",
          response
        );
      } else {
        console.warn(
          "userAPI.uploadResume not available — using local fallback"
        );
      }

      // Fallback: create an object URL so the UI can use the uploaded file immediately
      const objectUrl = URL.createObjectURL(file);
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          resumeUrl: objectUrl,
          resumeName: file.name,
          // note: this is a client-only fallback (not persisted on server)
        },
      };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return {
        success: true,
        message:
          "Resume saved locally (server upload not available or failed).",
      };
    } catch (error) {
      console.error("Resume upload error:", error);

      // Attempt fallback even on error
      try {
        const objectUrl = URL.createObjectURL(file);
        const updatedUser = {
          ...currentUser,
          profile: {
            ...currentUser.profile,
            resumeUrl: objectUrl,
            resumeName: file.name,
          },
        };
        setCurrentUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return {
          success: true,
          message: "Server upload failed — resume saved locally.",
        };
      } catch (fallbackError) {
        console.error("Fallback resume handling failed:", fallbackError);
        const message =
          error?.response?.data?.error || "Failed to upload resume.";
        return { success: false, message };
      }
    }
  };

  if (loading && !dataLoaded) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⌛</div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App" data-theme={theme}>
      {!currentUser ? (
        <Login
          onLogin={handleLogin}
          onRegister={handleRegister}
          onPasswordReset={handlePasswordReset}
          theme={theme}
          toggleTheme={toggleTheme}
          loading={loading}
        />
      ) : userType === "student" ? (
        <StudentDashboard
          user={currentUser}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          onUpdateProfile={updateUserProfile}
          jobs={jobs}
          applications={applications}
          onApply={handleApply}
          onRefetchData={refetchData}
          loading={loading}
          onUploadResume={handleResumeUpload}
          onRemoveApplication={handleRemoveApplication} // local-only remove handler
        />
      ) : userType === "organization" ? (
        <RecruiterDashboard
          user={currentUser}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          jobs={jobs}
          applications={applications}
          onUpdateApplicationStatus={updateApplicationStatus}
          onClearAttendedApplications={clearAttendedApplications}
          onCreateJob={createJob}
          onRefetchData={refetchData}
          loading={loading}
        />
      ) : userType === "admin" ? (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          onRefetchData={refetchData}
        />
      ) : (
        <div className="unknown-user-type">
          <h2>Unknown User Type</h2>
          <p>User type "{userType}" is not recognized.</p>
          <button onClick={handleLogout} className="logout-btn">
            Return to Login
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
