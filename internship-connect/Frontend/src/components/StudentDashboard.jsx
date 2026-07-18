import React, { useState, useMemo } from "react";

const StudentDashboard = ({
  user,
  onLogout,
  theme,
  toggleTheme,
  onUpdateProfile,
  jobs,
  applications,
  onApply,
  onRefetchData,
  onRemoveApplication,
  onUploadResume,
  onUploadPortfolio,
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedJob, setSelectedJob] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [removingApplicationId, setRemovingApplicationId] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  // Filter states for jobs tab
  const [searchTerm, setSearchTerm] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  // FIXED: Filter available jobs (all active jobs should be visible to students)
  const availableJobs = jobs.filter(
    (job) => job.status === "active" || !job.status
  );

  // Apply filters to jobs
  const filteredJobs = availableJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills?.some((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesType = !jobTypeFilter || job.type === jobTypeFilter;
    const matchesLocation =
      !locationFilter ||
      job.location.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesType && matchesLocation;
  });

  // --- NEW: compute recommended jobs — prefer server-provided match_score when available ---
  const recommendedJobs = useMemo(() => {
    // If server provided match_score values, use them directly (they're already 0-100%)
    const hasServerScores = availableJobs.some(
      (j) => typeof j.match_score !== "undefined"
    );

    if (hasServerScores) {
      // Server provides match_score as 0-100 already; use it directly without re-normalization
      return availableJobs
        .map((j) => ({
          ...j,
          matchScore: Number(j.match_score || 0),
        }))
        .sort((a, b) => b.matchScore - a.matchScore);
    }

    // Fallback: compute client-side score if server scores are not available
    if (!user.profile) {
      return availableJobs.map((job) => ({ ...job, matchScore: 0 }));
    }

    // Use the student's selected Program (stored in education.degree) as the primary career/program signal
    const programRaw = (
      user.profile?.education?.degree ||
      user.profile?.career ||
      user.profile?.career_choice ||
      ""
    )
      .toString()
      .trim()
      .toLowerCase();
    const userSkills = (user.profile.skills || []).map((s) =>
      s.toString().toLowerCase()
    );

    const scoreJob = (job) => {
      let score = 0;
      if (!job) return 0;

      const jobText = [
        job.title || "",
        job.company || "",
        job.description || "",
        job.type || "",
        job.location || "",
        job.field_category || "",
        ...(job.skills || []),
        ...(job.keywords || []),
      ]
        .join(" ")
        .toLowerCase();

      if (programRaw) {
        if (jobText.includes(programRaw)) {
          score += 30;
        } else {
          const programWords = programRaw.split(/\s+/);
          const matchingWords = programWords.filter((word) =>
            jobText.includes(word)
          );
          score += Math.round(
            (matchingWords.length / Math.max(1, programWords.length)) * 20
          );
        }
      }

      const jobSkills = (job.skills || []).map((s) =>
        s.toString().toLowerCase()
      );
      const userSkillSet = new Set(userSkills);
      const skillsInCommon = jobSkills.filter((s) => userSkillSet.has(s));

      if (jobSkills.length > 0) {
        const coverage = skillsInCommon.length / jobSkills.length;
        const relevance =
          userSkills.length > 0 ? skillsInCommon.length / userSkills.length : 0;
        score += Math.round(coverage * 25 + relevance * 15);
      }

      if (skillsInCommon.length > 0) score += 10;

      const userExperience = user.profile?.experience_level || "entry";
      const jobExperience = job.experience_level || "entry";
      if (jobExperience === userExperience) score += 15;
      else if (
        (userExperience === "entry" && jobExperience === "mid") ||
        (userExperience === "mid" &&
          (jobExperience === "entry" || jobExperience === "senior"))
      )
        score += 7;

      if (programRaw && job.field_category) {
        const field = job.field_category.toString().toLowerCase();
        if (field.includes(programRaw) || programRaw.includes(field))
          score += 15;
        else {
          const progWords = programRaw.split(/\s+/);
          const matching = progWords.filter((w) => field.includes(w));
          if (matching.length > 0) score += 8;
        }
      }

      return Math.min(100, score);
    };

    return availableJobs
      .map((job) => ({ ...job, matchScore: scoreJob(job) }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [availableJobs, user]);

  // Theme-aware colors
  const themeColors = {
    light: {
      background: "#ffffff",
      surface: "#f8f9fa",
      text: "#2d3748",
      textSecondary: "#4a5568",
      border: "#e2e8f0",
      primary: "#007bff",
      primaryHover: "#0056b3",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
    },
    dark: {
      background: "#1a202c",
      surface: "#2d3748",
      text: "#f7fafc",
      textSecondary: "#e2e8f0",
      border: "#4a5568",
      primary: "#63b3ed",
      primaryHover: "#90cdf4",
      success: "#68d391",
      warning: "#faf089",
      error: "#fc8181",
    },
  };

  const colors = themeColors[theme];

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setActiveTab("job-details");
  };

  const handleApply = async (job) => {
    const result = await onApply(
      user.id,
      job.id,
      `I'm excited to apply for the ${job.title} position at ${job.company}.`
    );
    if (result.success) {
      alert(result.message);
      // Add success notification
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "success",
          title: "Application Submitted",
          message: `You've applied for ${job.title} at ${job.company}`,
          time: "Just now",
          read: false,
        },
        ...prev,
      ]);

      // Refresh data to update application status
      setTimeout(() => {
        onRefetchData();
      }, 500);
    } else {
      alert(result.message);
    }
  };

  // Handle remove application
  const handleRemoveApplication = async (applicationId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this application from your dashboard?"
      )
    ) {
      setRemovingApplicationId(applicationId);
      try {
        const result = await onRemoveApplication(applicationId);
        if (result.success) {
          // Add success notification
          setNotifications((prev) => [
            {
              id: Date.now(),
              type: "success",
              title: "Application Removed",
              message: "Application has been removed from your dashboard",
              time: "Just now",
              read: false,
            },
            ...prev,
          ]);

          // NOTE: do NOT call onRefetchData here — removal is local-only.
          // onRefetchData() would refetch from server and reintroduce the removed item.
        } else {
          alert(result.message || "Failed to remove application");
        }
      } catch (error) {
        alert("Error removing application");
        console.error("Error removing application:", error);
      } finally {
        setRemovingApplicationId(null);
      }
    }
  };

  // Handle resume upload
  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a PDF
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file for your resume.");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB.");
      return;
    }

    setUploadingResume(true);
    try {
      const result = await onUploadResume(user.id, file);
      if (result.success) {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: "success",
            title: "Resume Updated",
            message: "Your resume has been successfully uploaded",
            time: "Just now",
            read: false,
          },
          ...prev,
        ]);

        // Refresh user data
        setTimeout(() => {
          onRefetchData();
        }, 500);
      } else {
        alert(result.message || "Failed to upload resume");
      }
    } catch (error) {
      alert("Error uploading resume");
      console.error("Error uploading resume:", error);
    } finally {
      setUploadingResume(false);
      // Reset file input
      event.target.value = "";
    }
  };

  // Handle portfolio upload/URL
  const handlePortfolioUpdate = async (portfolioUrl) => {
    if (!portfolioUrl) return;

    // Basic URL validation
    try {
      new URL(portfolioUrl);
    } catch {
      alert("Please enter a valid URL for your portfolio");
      return;
    }

    setUploadingPortfolio(true);
    try {
      const result = await onUploadPortfolio(user.id, portfolioUrl);
      if (result.success) {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: "success",
            title: "Portfolio Updated",
            message: "Your portfolio link has been updated",
            time: "Just now",
            read: false,
          },
          ...prev,
        ]);

        // Refresh user data
        setTimeout(() => {
          onRefetchData();
        }, 500);
      } else {
        alert(result.message || "Failed to update portfolio");
      }
    } catch (error) {
      alert("Error updating portfolio");
      console.error("Error updating portfolio:", error);
    } finally {
      setUploadingPortfolio(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setJobTypeFilter("");
    setLocationFilter("");
  };

  const markNotificationAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const studentApplications = applications.filter(
    (app) => app.student_id === user.id
  );
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <h1>Intern Connect</h1>
            <span>Student Dashboard</span>
          </div>
          <div className="user-menu">
            <div className="theme-toggle">
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {theme === "light" ? "🌙" : "☀️"}
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="notifications-container">
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <span className="notification-icon">🔔</span>
                {unreadNotificationsCount > 0 && (
                  <span className="notification-badge">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  className="notifications-dropdown"
                  style={{
                    background: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <div
                    className="notifications-header"
                    style={{ borderBottomColor: colors.border }}
                  >
                    <h4 style={{ color: colors.text }}>Notifications</h4>
                    <button
                      className="clear-all-btn"
                      onClick={clearAllNotifications}
                      style={{ color: colors.textSecondary }}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">
                        <p style={{ color: colors.textSecondary }}>
                          No notifications
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`notification-item ${
                            notification.read ? "read" : "unread"
                          }`}
                          onClick={() =>
                            markNotificationAsRead(notification.id)
                          }
                          style={{
                            borderBottomColor: colors.border,
                            background: notification.read
                              ? colors.background
                              : colors.surface,
                          }}
                        >
                          <div className="notification-content">
                            <h5 style={{ color: colors.text }}>
                              {notification.title}
                            </h5>
                            <p style={{ color: colors.textSecondary }}>
                              {notification.message}
                            </p>
                            <span
                              className="notification-time"
                              style={{ color: colors.textSecondary }}
                            >
                              {notification.time}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-info">
              <div className="user-avatar">👤</div>
              <span>Hey, {user.name}!</span>
            </div>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <nav className="sidebar">
          <button
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === "jobs" ? "active" : ""}`}
            onClick={() => setActiveTab("jobs")}
          >
            🔍 Find Jobs
          </button>
          <button
            className={`nav-btn ${
              activeTab === "applications" ? "active" : ""
            }`}
            onClick={() => setActiveTab("applications")}
          >
            📄 Applications ({studentApplications.length})
          </button>
          <button
            className={`nav-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Profile
          </button>
          {selectedJob && (
            <button
              className={`nav-btn ${
                activeTab === "job-details" ? "active" : ""
              }`}
              onClick={() => setActiveTab("job-details")}
            >
              💼 Job Details
            </button>
          )}
        </nav>

        <main className="main-content">
          {activeTab === "dashboard" && (
            <div className="dashboard-tab">
              <div className="welcome-banner">
                <div className="banner-content">
                  <h2>Welcome back, {user.name}! 👋</h2>
                  <p>Ready to discover your next opportunity? Let's go! 🚀</p>
                  <button
                    className="cta-btn"
                    onClick={() => setActiveTab("jobs")}
                  >
                    Browse Jobs
                  </button>
                </div>
                <div className="banner-graphic">
                  <div className="floating-card">💼</div>
                  <div className="floating-card">🎯</div>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <h3>{availableJobs.length}</h3>
                  <p>Available Jobs</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📨</div>
                  <h3>{studentApplications.length}</h3>
                  <p>Applications</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <h3>
                    {
                      studentApplications.filter(
                        (app) => app.status === "shortlisted"
                      ).length
                    }
                  </h3>
                  <p>Shortlisted</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <h3>{(user.profile?.skills?.length || 0) * 10}%</h3>
                  <p>Profile Score</p>
                </div>
              </div>

              {/* NEW: Recommended for you section */}
              <section
                className="recommended-for-you"
                style={{ marginBottom: 24 }}
              >
                <div className="section-header">
                  <h3>Recommended for you</h3>
                  <p style={{ color: "#6b7280" }}>
                    Based on your career choice
                    {user.profile?.career || user.profile?.career_choice
                      ? `: "${
                          user.profile?.career || user.profile?.career_choice
                        }"`
                      : ""}{" "}
                    and skills
                  </p>
                </div>
                <div className="jobs-grid" style={{ marginBottom: 0 }}>
                  {recommendedJobs.slice(0, 6).map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-header">
                        <div className="job-title-section">
                          <span className="job-logo-static">💼</span>
                          <h4>{job.title}</h4>
                        </div>
                        <span
                          className={`match-badge ${
                            job.matchScore >= 70
                              ? "match-high"
                              : job.matchScore >= 40
                              ? "match-medium"
                              : "match-low"
                          }`}
                          title={`Match ${job.matchScore}%`}
                        >
                          {job.matchScore}% Match
                        </span>
                      </div>
                      <p className="company">
                        {job.company} • 📍 {job.location}
                      </p>
                      <div className="job-meta">
                        <span className="job-type">{job.type}</span>
                        <span className="salary">{job.salary}</span>
                      </div>

                      <div className="skills">
                        {job.skills?.map((skill) => (
                          <span key={skill} className="skill-tag">
                            #{skill}
                          </span>
                        ))}
                      </div>

                      <div className="job-footer">
                        <span className="posted-date">
                          🕒{" "}
                          {job.posted_date
                            ? new Date(job.posted_date).toLocaleDateString()
                            : ""}
                        </span>
                        <div className="job-actions">
                          <button
                            className="view-btn"
                            onClick={() => handleJobClick(job)}
                          >
                            View Details
                          </button>
                          <button
                            className="apply-btn"
                            onClick={() => handleApply(job)}
                            disabled={studentApplications.some(
                              (app) => app.job_id === job.id
                            )}
                          >
                            {studentApplications.some(
                              (app) => app.job_id === job.id
                            )
                              ? `Applied (${
                                  studentApplications.find(
                                    (app) => app.job_id === job.id
                                  )?.status
                                })`
                              : "Apply Now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recommendedJobs.length === 0 && (
                    <div className="empty-state" style={{ padding: "2rem" }}>
                      <div className="empty-icon">🔎</div>
                      <h3>No personalized recommendations yet</h3>
                      <p style={{ color: "#6b7280" }}>
                        Set your career choice in your profile and add skills to
                        get tailored job suggestions.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="job-marquee-section">
                <div className="section-header">
                  <h3>Featured Opportunities</h3>
                  <p>Click on any opportunity to view details</p>
                </div>
                <div className="marquee-container">
                  <div className="marquee-track">
                    {availableJobs.map((job, index) => (
                      <div
                        key={`${job.id}-${index}`}
                        className="marquee-job-card"
                        onClick={() => handleJobClick(job)}
                      >
                        <div className="job-logo">💼</div>
                        <div className="job-content">
                          <h4>{job.title}</h4>
                          <p className="company">{job.company}</p>
                          <span className="salary">{job.salary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="recommended-jobs">
                <div className="section-header">
                  <h3>Available Jobs</h3>
                  <p>Browse all available opportunities</p>
                </div>
                <div className="jobs-grid">
                  {availableJobs.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-header">
                        <div className="job-title-section">
                          <span className="job-logo-static">💼</span>
                          <h4>{job.title}</h4>
                        </div>
                        <span className="match-badge match-high">New</span>
                      </div>
                      <p className="company">
                        {job.company} • 📍 {job.location}
                      </p>
                      <div className="job-meta">
                        <span className="job-type">{job.type}</span>
                        <span className="salary">{job.salary}</span>
                      </div>

                      <div className="skills">
                        {job.skills?.map((skill) => (
                          <span key={skill} className="skill-tag">
                            #{skill}
                          </span>
                        ))}
                      </div>

                      <div className="job-footer">
                        <span className="posted-date">
                          🕒 {new Date(job.posted_date).toLocaleDateString()}
                        </span>
                        <div className="job-actions">
                          <button
                            className="view-btn"
                            onClick={() => handleJobClick(job)}
                          >
                            View Details
                          </button>
                          <button
                            className="apply-btn"
                            onClick={() => handleApply(job)}
                            disabled={studentApplications.some(
                              (app) => app.job_id === job.id
                            )}
                          >
                            {studentApplications.some(
                              (app) => app.job_id === job.id
                            )
                              ? `Applied (${
                                  studentApplications.find(
                                    (app) => app.job_id === job.id
                                  )?.status
                                })`
                              : "Apply Now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="jobs-tab">
              <div className="tab-header">
                <h2>🔍 Find Your Dream Internship</h2>
                <div className="search-filters">
                  <input
                    type="text"
                    placeholder="Search jobs, companies, or keywords..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      background: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                  <select
                    className="filter-select"
                    value={jobTypeFilter}
                    onChange={(e) => setJobTypeFilter(e.target.value)}
                    style={{
                      background: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="Internship">Internship</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Full-time">Full-time</option>
                  </select>
                  <select
                    className="filter-select"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    style={{
                      background: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    <option value="">All Locations</option>
                    <option value="lusaka">Lusaka</option>
                    <option value="remote">Remote</option>
                    <option value="ndola">Ndola</option>
                  </select>
                  {(searchTerm || jobTypeFilter || locationFilter) && (
                    <button
                      className="clear-filters-btn"
                      onClick={clearFilters}
                      style={{
                        background: theme === "light" ? "#6c757d" : "#4a5568",
                        color: "white",
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <div
                  className="filter-results"
                  style={{ color: colors.textSecondary }}
                >
                  <p>
                    Showing {filteredJobs.length} of {availableJobs.length} jobs
                  </p>
                </div>
              </div>
              <div className="jobs-search-container">
                <div className="jobs-grid">
                  {filteredJobs.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-header">
                        <div className="job-title-section">
                          <span className="job-logo-static">💼</span>
                          <h4>{job.title}</h4>
                        </div>
                        <span className="match-badge match-high">New</span>
                      </div>
                      <p className="company">
                        {job.company} • 📍 {job.location}
                      </p>
                      <div className="job-meta">
                        <span className="job-type">{job.type}</span>
                        <span className="salary">{job.salary}</span>
                      </div>

                      <div className="skills">
                        {job.skills?.map((skill) => (
                          <span key={skill} className="skill-tag">
                            #{skill}
                          </span>
                        ))}
                      </div>

                      <div className="job-footer">
                        <span className="posted-date">
                          🕒 {new Date(job.posted_date).toLocaleDateString()}
                        </span>
                        <div className="job-actions">
                          <button
                            className="view-btn"
                            onClick={() => handleJobClick(job)}
                          >
                            View Details
                          </button>
                          <button
                            className="apply-btn"
                            onClick={() => handleApply(job)}
                            disabled={studentApplications.some(
                              (app) => app.job_id === job.id
                            )}
                          >
                            {studentApplications.some(
                              (app) => app.job_id === job.id
                            )
                              ? `Applied (${
                                  studentApplications.find(
                                    (app) => app.job_id === job.id
                                  )?.status
                                })`
                              : "Apply Now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredJobs.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <h3 style={{ color: colors.text }}>No jobs found</h3>
                      <p style={{ color: colors.textSecondary }}>
                        Try adjusting your search criteria or clear filters
                      </p>
                      {(searchTerm || jobTypeFilter || locationFilter) && (
                        <button className="cta-btn" onClick={clearFilters}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "applications" && (
            <div className="applications-tab">
              <h2>📄 My Applications ({studentApplications.length})</h2>
              <div className="applications-container">
                {studentApplications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No applications yet</h3>
                    <p>Start applying to jobs to see them here!</p>
                    <button
                      className="cta-btn"
                      onClick={() => setActiveTab("jobs")}
                    >
                      Browse Jobs
                    </button>
                  </div>
                ) : (
                  <div className="applications-list">
                    {studentApplications.map((application) => {
                      const job = jobs.find((j) => j.id === application.job_id);
                      return (
                        <div key={application.id} className="application-card">
                          <div className="application-header">
                            <h4>{job?.title || "Job"}</h4>
                            <span
                              className={`status-badge status-${application.status}`}
                            >
                              {application.status}
                            </span>
                          </div>
                          <p className="company">{job?.company}</p>
                          <div className="application-meta">
                            <span>
                              Applied:{" "}
                              {new Date(
                                application.applied_date
                              ).toLocaleDateString()}
                            </span>
                            <span>Location: {job?.location}</span>
                            <span>Type: {job?.type}</span>
                          </div>
                          <div className="application-actions">
                            <button
                              className="view-job-btn"
                              onClick={() => {
                                if (job) handleJobClick(job);
                              }}
                            >
                              View Job
                            </button>
                            {application.status === "rejected" && (
                              <button
                                className="remove-btn"
                                onClick={() =>
                                  handleRemoveApplication(application.id)
                                }
                                disabled={
                                  removingApplicationId === application.id
                                }
                                style={{
                                  backgroundColor: "#ff4444",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor:
                                    removingApplicationId === application.id
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity:
                                    removingApplicationId === application.id
                                      ? 0.6
                                      : 1,
                                }}
                              >
                                {removingApplicationId === application.id
                                  ? "Removing..."
                                  : "Remove"}
                              </button>
                            )}
                            {application.status === "pending" && (
                              <button
                                className="withdraw-btn"
                                style={{
                                  backgroundColor: "#666",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="profile-tab">
              <h2>👤 My Profile</h2>
              <div className="profile-container">
                {/* Resume Upload Section */}
                <div className="profile-section">
                  <h3>Resume</h3>
                  <div className="upload-section">
                    <div className="upload-info">
                      <p>Upload your resume (PDF only, max 5MB)</p>
                      {user.profile?.resumeUrl ? (
                        <div className="file-status">
                          <span className="file-name">
                            📄 Current Resume:{" "}
                            {user.profile.resumeName || "resume.pdf"}
                          </span>
                          <a
                            href={user.profile.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-file-link"
                          >
                            View Resume
                          </a>
                        </div>
                      ) : (
                        <div className="file-status">
                          <span className="no-file">No resume uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="upload-controls">
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf"
                        onChange={handleResumeUpload}
                        disabled={uploadingResume}
                        style={{ display: "none" }}
                      />
                      <label
                        htmlFor="resume-upload"
                        className={`upload-btn ${
                          uploadingResume ? "uploading" : ""
                        }`}
                      >
                        {uploadingResume ? "Uploading..." : "Upload Resume"}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Portfolio Section */}
                <div className="profile-section">
                  <h3>Portfolio</h3>
                  <div className="portfolio-section">
                    <div className="form-group">
                      <label>Portfolio URL</label>
                      <div className="portfolio-input-group">
                        <input
                          type="url"
                          value={user.profile?.portfolioUrl || ""}
                          onChange={(e) =>
                            onUpdateProfile(user.id, {
                              ...user.profile,
                              portfolioUrl: e.target.value,
                            })
                          }
                          className="form-input"
                          placeholder="https://yourportfolio.com"
                          disabled={uploadingPortfolio}
                        />
                        <button
                          onClick={() =>
                            handlePortfolioUpdate(user.profile?.portfolioUrl)
                          }
                          disabled={
                            uploadingPortfolio || !user.profile?.portfolioUrl
                          }
                          className="save-portfolio-btn"
                        >
                          {uploadingPortfolio ? "Saving..." : "Save"}
                        </button>
                      </div>
                      <small className="help-text">
                        Link to your GitHub, Behance, personal website, etc.
                      </small>
                    </div>
                    {user.profile?.portfolioUrl && (
                      <div className="portfolio-preview">
                        <a
                          href={user.profile.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portfolio-link"
                        >
                          🌐 View Portfolio
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="profile-section">
                  <h3>Personal Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={user.name}
                        className="form-input"
                        readOnly
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={user.email}
                        className="form-input"
                        readOnly
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={user.profile?.phone || ""}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            phone: e.target.value,
                          })
                        }
                        className="form-input"
                        placeholder="+260 XXX XXX XXX"
                      />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        value={user.profile?.location || ""}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            location: e.target.value,
                          })
                        }
                        className="form-input"
                        placeholder="Lusaka, Zambia"
                      />
                    </div>
                    {/* Career Choice input */}
                    <div className="form-group">
                      <label>Career Choice / Target Role</label>
                      <input
                        type="text"
                        value={
                          user.profile?.career ||
                          user.profile?.career_choice ||
                          ""
                        }
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            career: e.target.value,
                            career_choice: e.target.value,
                          })
                        }
                        className="form-input"
                        placeholder="e.g., Financial Analyst, Accountant, Investment Banking, Audit"
                      />
                      <small className="help-text">
                        Enter a role, domain or industry you are aiming for to
                        improve recommendations
                      </small>
                    </div>

                    {/* Experience Level */}
                    <div className="form-group">
                      <label>Experience Level</label>
                      <select
                        value={user.profile?.experience_level || "entry"}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            experience_level: e.target.value,
                          })
                        }
                        className="form-input"
                      >
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior Level</option>
                      </select>
                    </div>

                    {/* Field Interests */}
                    <div className="form-group">
                      <label>Field Interests</label>
                      <select
                        multiple
                        value={user.profile?.field_interests || []}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            field_interests: Array.from(
                              e.target.selectedOptions,
                              (option) => option.value
                            ),
                          })
                        }
                        className="form-input"
                        style={{ height: "100px" }}
                      >
                        <option value="Technology">Technology</option>
                        <option value="Finance">Finance</option>
                      </select>
                      <small className="help-text">
                        Hold Ctrl/Cmd to select multiple fields
                      </small>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Education</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>University</label>
                      <input
                        type="text"
                        value={user.profile?.education?.university || ""}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            education: {
                              ...user.profile.education,
                              university: e.target.value,
                            },
                          })
                        }
                        className="form-input"
                        placeholder="University of Zambia"
                      />
                    </div>
                    <div className="form-group">
                      <label>Degree</label>
                      <input
                        type="text"
                        value={user.profile?.education?.degree || ""}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            education: {
                              ...user.profile.education,
                              degree: e.target.value,
                            },
                          })
                        }
                        className="form-input"
                        placeholder="Bachelor of Computer Science"
                      />
                    </div>
                    <div className="form-group">
                      <label>Graduation Year</label>
                      <input
                        type="number"
                        value={user.profile?.education?.graduationYear || ""}
                        onChange={(e) =>
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            education: {
                              ...user.profile.education,
                              graduationYear: e.target.value,
                            },
                          })
                        }
                        className="form-input"
                        placeholder="2024"
                        min="2020"
                        max="2030"
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Skills</h3>
                  <div className="skills-input-container">
                    <input
                      type="text"
                      placeholder="Add a skill and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          onUpdateProfile(user.id, {
                            ...user.profile,
                            skills: [
                              ...(user.profile?.skills || []),
                              e.target.value.trim(),
                            ],
                          });
                          e.target.value = "";
                        }
                      }}
                      className="skills-input"
                    />
                    <div className="skills-list">
                      {user.profile?.skills?.map((skill, index) => (
                        <span key={index} className="skill-tag">
                          {skill}
                          <button
                            onClick={() =>
                              onUpdateProfile(user.id, {
                                ...user.profile,
                                skills: user.profile.skills.filter(
                                  (_, i) => i !== index
                                ),
                              })
                            }
                            className="remove-skill"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button
                    className="save-btn"
                    onClick={() => alert("Profile saved successfully!")}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "job-details" && selectedJob && (
            <div className="job-details-tab">
              <div className="job-details-header">
                <button
                  className="back-btn"
                  onClick={() => setActiveTab("jobs")}
                >
                  ← Back to Jobs
                </button>
                <h2>{selectedJob.title}</h2>
                <p className="company-large">
                  {selectedJob.company} • 📍 {selectedJob.location}
                </p>
              </div>

              <div className="job-details-content">
                <div className="job-main-info">
                  <div className="job-meta-large">
                    <span className="job-type-large">{selectedJob.type}</span>
                    <span className="salary-large">{selectedJob.salary}</span>
                    <span className="match-badge-large">New</span>
                  </div>

                  <div className="job-description">
                    <h3>Job Description</h3>
                    <p>{selectedJob.description}</p>
                  </div>

                  <div className="job-requirements">
                    <h3>Requirements</h3>
                    <ul>
                      {selectedJob.requirements?.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="job-responsibilities">
                    <h3>Responsibilities</h3>
                    <ul>
                      {selectedJob.responsibilities?.map((resp, index) => (
                        <li key={index}>{resp}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="job-skills">
                    <h3>Required Skills</h3>
                    <div className="skills">
                      {selectedJob.skills?.map((skill) => (
                        <span key={skill} className="skill-tag-large">
                          #{skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="job-sidebar">
                  <div className="apply-card">
                    <h4>Ready to Apply?</h4>
                    <p>Submit your application for this position</p>
                    <button
                      className="apply-now-btn"
                      onClick={() => handleApply(selectedJob)}
                      disabled={studentApplications.some(
                        (app) => app.job_id === selectedJob.id
                      )}
                    >
                      {studentApplications.some(
                        (app) => app.job_id === selectedJob.id
                      )
                        ? `Already Applied (${
                            studentApplications.find(
                              (app) => app.job_id === selectedJob.id
                            )?.status
                          })`
                        : "Apply Now"}
                    </button>
                    <div className="application-stats">
                      <span>
                        ⏰ Posted{" "}
                        {new Date(selectedJob.posted_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="company-info">
                    <h4>About {selectedJob.company}</h4>
                    <p>
                      {selectedJob.company_description ||
                        "Company information not available."}
                    </p>
                    <div className="company-stats">
                      {selectedJob.company_size && (
                        <span>👥 {selectedJob.company_size}</span>
                      )}
                      <span>
                        🏢{" "}
                        {selectedJob.company_industry ||
                          selectedJob.field_category ||
                          "General"}
                      </span>
                      <span>
                        📍{" "}
                        {selectedJob.company_location || selectedJob.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add CSS for the new filter styles */}
      <style jsx>{`
        .search-filters {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 10px 16px;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .filter-select {
          padding: 10px 16px;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.9rem;
          min-width: 140px;
        }

        .clear-filters-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .clear-filters-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .filter-results {
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
        }

        .empty-state .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        /* Rest of the existing CSS remains the same */
        .notifications-container {
          position: relative;
        }

        .notification-btn {
          position: relative;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
        }

        .notification-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #ff4444;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notifications-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }

        .notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid;
        }

        .notifications-header h4 {
          margin: 0;
        }

        .clear-all-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .notifications-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 1rem;
          border-bottom: 1px solid;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .notification-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .notification-content h5 {
          margin: 0 0 0.25rem 0;
          font-size: 0.9rem;
        }

        .notification-content p {
          margin: 0 0 0.5rem 0;
          font-size: 0.8rem;
        }

        .notification-time {
          font-size: 0.7rem;
        }

        .no-notifications {
          padding: 2rem;
          text-align: center;
        }

        .application-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .remove-btn:hover {
          background-color: #cc0000 !important;
        }

        .withdraw-btn:hover {
          background-color: #555 !important;
        }

        /* New styles for resume and portfolio sections */
        .upload-section {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .upload-info {
          margin-bottom: 1rem;
        }

        .file-status {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .file-name {
          color: #333;
          margin-right: 1rem;
        }

        .no-file {
          color: #666;
          font-style: italic;
        }

        .view-file-link,
        .portfolio-link {
          color: #007bff;
          text-decoration: none;
        }

        .view-file-link:hover,
        .portfolio-link:hover {
          text-decoration: underline;
        }

        .upload-btn {
          display: inline-block;
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          text-align: center;
        }

        .upload-btn:hover {
          background: #0056b3;
        }

        .upload-btn.uploading {
          background: #6c757d;
          cursor: not-allowed;
        }

        .portfolio-input-group {
          display: flex;
          gap: 10px;
        }

        .portfolio-input-group .form-input {
          flex: 1;
        }

        .save-portfolio-btn {
          padding: 10px 20px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
        }

        .save-portfolio-btn:hover:not(:disabled) {
          background: #218838;
        }

        .save-portfolio-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .portfolio-preview {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .help-text {
          color: #666;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
};

{
  /* Match badge styles */
}
<style jsx>{`
  .match-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 500;
    background-color: #f3f4f6;
  }

  .match-badge.match-high {
    background-color: #d1fae5;
    color: #065f46;
  }

  .match-badge.match-medium {
    background-color: #fef3c7;
    color: #92400e;
  }

  .match-badge.match-low {
    background-color: #fee2e2;
    color: #991b1b;
  }
`}</style>;

export default StudentDashboard;
