import React, { useState } from "react";

const RecruiterDashboard = ({
  user,
  onLogout,
  theme,
  toggleTheme,
  jobs,
  applications,
  onUpdateApplicationStatus,
  onClearAttendedApplications,
  onCreateJob,
  onRefetchData,
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    // Check if user has completed tutorial before
    const hasCompletedTutorial = localStorage.getItem("hasCompletedTutorial");
    return !hasCompletedTutorial;
  });
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  // Function to complete tutorial
  const completeTutorial = () => {
    localStorage.setItem("hasCompletedTutorial", "true");
    setShowTutorial(false);
  };

  // Tutorial steps configuration
  const tutorialSteps = [
    {
      target: ".stats-grid",
      title: "Dashboard Overview",
      content:
        "Here you can see key metrics at a glance: your active jobs, total applications, pending reviews, and shortlisted candidates.",
      position: "bottom",
    },
    {
      target: ".sidebar",
      title: "Navigation Menu",
      content:
        "Use these buttons to switch between different sections of your dashboard.",
      position: "right",
    },
    {
      target: ".create-job-btn",
      title: "Create New Jobs",
      content: "Click here to post new internship opportunities for students.",
      position: "left",
    },
    {
      target: ".applications-preview",
      title: "Recent Applications",
      content: "View and manage the most recent applications from students.",
      position: "top",
    },
    {
      target: ".analytics-grid",
      title: "Analytics",
      content:
        "Track your recruitment progress and analyze application trends.",
      position: "bottom",
    },
  ];

  // Handle tutorial navigation
  const handleTutorialNext = () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      setCurrentTutorialStep((curr) => curr + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const handleTutorialPrev = () => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep((curr) => curr - 1);
    }
  };

  const [newJob, setNewJob] = useState({
    title: "",
    type: "Internship",
    location: "",
    salary: "",
    description: "",
    requirements: "",
    responsibilities: "",
    skills: "",
    experience_level: "entry",
    field_category: "",
    keywords: "",
  });

  // Filter jobs posted by this recruiter - FIXED: Use posted_by instead of postedBy
  const myJobs = jobs.filter((job) => job.posted_by === user.id);

  // Get applications for my jobs
  const myApplications = applications.filter((app) =>
    myJobs.some((job) => job.id === app.job_id)
  );

  const pendingApplications = myApplications.filter(
    (app) => app.status === "pending"
  );
  const shortlistedApplications = myApplications.filter(
    (app) => app.status === "shortlisted"
  );
  const rejectedApplications = myApplications.filter(
    (app) => app.status === "rejected"
  );

  const handleCreateJob = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !newJob.title ||
      !newJob.location ||
      !newJob.salary ||
      !newJob.description
    ) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const jobData = {
        title: newJob.title,
        type: newJob.type,
        location: newJob.location,
        salary: newJob.salary,
        description: newJob.description,
        company: user.profile?.company || user.name,
        skills: newJob.skills.split(",").map((skill) => skill.trim()),
        requirements: newJob.requirements
          .split("\n")
          .filter((req) => req.trim()),
        experience_level: newJob.experience_level,
        field_category: newJob.field_category,
        keywords: newJob.keywords.split(",").map((k) => k.trim()),
        responsibilities: newJob.responsibilities
          .split("\n")
          .filter((resp) => resp.trim()),
      };

      const result = await onCreateJob(jobData);

      if (result.success) {
        setShowCreateJob(false);

        // Reset form
        setNewJob({
          title: "",
          type: "Internship",
          location: "",
          salary: "",
          description: "",
          requirements: "",
          responsibilities: "",
          skills: "",
          experience_level: "entry",
          field_category: "",
          keywords: "",
        });
        alert(`Job "${result.job.title}" posted successfully!`);

        // Force refresh data to show new job everywhere
        setTimeout(() => {
          onRefetchData();
        }, 1000);
      } else {
        alert(`Failed to create job: ${result.message}`);
      }
    } catch (error) {
      console.error("Job creation error:", error);
      alert("Failed to create job. Please try again.");
    }
  };

  const handleClearAttended = () => {
    const result = onClearAttendedApplications();
    if (result.success) {
      alert(`Cleared ${result.count} attended applications!`);
    } else {
      alert("Failed to clear applications");
    }
  };

  const getJobApplications = (jobId) => {
    return myApplications.filter((app) => app.job_id === jobId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "shortlisted":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // Handle viewing full profile
  const handleViewFullProfile = (application) => {
    setSelectedApplication(application);
    setShowProfileModal(true);
  };

  // Close profile modal
  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setSelectedApplication(null);
  };

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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <h1>Intern Connect</h1>
            <span>
              Recruiter Dashboard - {user.profile?.company || user.name}
            </span>
          </div>
          <div className="user-menu">
            <div className="theme-toggle">
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {theme === "light" ? "🌙" : "☀️"}
              </button>
            </div>
            <div className="user-info">
              <div className="user-avatar">💼</div>
              <span>Welcome, {user.name}!</span>
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
            style={{
              background:
                activeTab === "dashboard" ? colors.primary : "transparent",
            }}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === "jobs" ? "active" : ""}`}
            onClick={() => setActiveTab("jobs")}
          >
            💼 My Job Postings ({myJobs.length})
          </button>
          <button
            className={`nav-btn ${
              activeTab === "applications" ? "active" : ""
            }`}
            onClick={() => setActiveTab("applications")}
          >
            📋 Applications ({myApplications.length})
          </button>
          <button
            className={`nav-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📈 Analytics
          </button>
        </nav>

        <main className="main-content">
          {activeTab === "dashboard" && (
            <div className="dashboard-tab">
              <div className="welcome-banner">
                <div className="banner-content">
                  <h2>Welcome back, {user.name}! 👋</h2>
                  <p>
                    Manage your job postings and review applications from
                    talented students.
                  </p>
                  <div className="banner-actions">
                    <button
                      className="cta-btn"
                      onClick={() => setShowCreateJob(true)}
                    >
                      + Post New Job
                    </button>
                    <button
                      className="cta-btn secondary"
                      onClick={() => setActiveTab("applications")}
                    >
                      📋 Review Applications
                    </button>
                  </div>
                </div>
                <div className="banner-graphic">
                  <div className="floating-card">🎯</div>
                  <div className="floating-card">⚡</div>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">💼</div>
                  <h3>{myJobs.length}</h3>
                  <p>Active Jobs</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📨</div>
                  <h3>{myApplications.length}</h3>
                  <p>Total Applications</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏳</div>
                  <h3>{pendingApplications.length}</h3>
                  <p>Pending Review</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <h3>{shortlistedApplications.length}</h3>
                  <p>Shortlisted</p>
                </div>
              </div>

              <div className="quick-actions">
                <h3>Recent Applications</h3>
                <div className="applications-preview">
                  {myApplications.slice(0, 5).map((application) => {
                    const job = jobs.find((j) => j.id === application.job_id);
                    return (
                      <div
                        key={application.id}
                        className="application-preview-card"
                      >
                        <div className="application-info">
                          <h4>{application.student_name}</h4>
                          <p>Applied for: {job?.title}</p>
                          <span className="application-date">
                            {new Date(
                              application.applied_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="application-status">
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(
                                application.status
                              ),
                            }}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {myApplications.length === 0 && (
                    <div className="empty-state">
                      <p>No applications yet. Post a job to get started!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="jobs-tab">
              <div className="tab-header">
                <h2>My Job Postings</h2>
                <button
                  className="create-job-btn"
                  onClick={() => setShowCreateJob(true)}
                >
                  + Create New Job
                </button>
              </div>
              <div className="jobs-list">
                {myJobs.map((job) => (
                  <div key={job.id} className="job-posting-card">
                    <div className="job-header">
                      <h3>{job.title}</h3>
                      <span className="job-status">
                        {job.status || "active"}
                      </span>
                    </div>
                    <div className="job-details">
                      <p>
                        <strong>Location:</strong> {job.location}
                      </p>
                      <p>
                        <strong>Type:</strong> {job.type}
                      </p>
                      <p>
                        <strong>Salary:</strong> {job.salary}
                      </p>
                      <p>
                        <strong>Applications:</strong>{" "}
                        {getJobApplications(job.id).length}
                      </p>
                    </div>
                    <div className="job-actions">
                      <button
                        className="view-applications-btn"
                        onClick={() => {
                          setActiveTab("applications");
                        }}
                      >
                        View Applications ({getJobApplications(job.id).length})
                      </button>
                    </div>
                  </div>
                ))}
                {myJobs.length === 0 && (
                  <div className="empty-state">
                    <h3>No job postings yet</h3>
                    <p>
                      Create your first job posting to start receiving
                      applications
                    </p>
                    <button
                      className="cta-btn"
                      onClick={() => setShowCreateJob(true)}
                    >
                      Create Your First Job
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "applications" && (
            <div className="applications-tab">
              <div className="tab-header">
                <h2>Applications Management</h2>
                <div className="application-actions">
                  <button
                    className="clear-applications-btn"
                    onClick={handleClearAttended}
                    disabled={
                      shortlistedApplications.length === 0 &&
                      rejectedApplications.length === 0
                    }
                  >
                    🗑️ Clear Attended Applications
                  </button>
                </div>
              </div>

              <div className="applications-filters">
                <button
                  className={`filter-btn ${
                    activeTab === "applications" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("applications")}
                >
                  All ({myApplications.length})
                </button>
                <button className="filter-btn">
                  Pending ({pendingApplications.length})
                </button>
                <button className="filter-btn">
                  Shortlisted ({shortlistedApplications.length})
                </button>
                <button className="filter-btn">
                  Rejected ({rejectedApplications.length})
                </button>
              </div>

              <div className="applications-list">
                {myApplications.map((application) => {
                  const job = jobs.find((j) => j.id === application.job_id);
                  return (
                    <div key={application.id} className="application-card">
                      <div className="application-header">
                        <div className="applicant-info">
                          <h3>{application.student_name}</h3>
                          <p>{application.student_email}</p>
                          <p>{application.student_university}</p>
                        </div>
                        <div className="application-meta">
                          <span className="job-title">
                            Applied for: {job?.title}
                          </span>
                          <span className="application-date">
                            {new Date(
                              application.applied_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="application-details">
                        <div className="applicant-skills">
                          <h4>Skills:</h4>
                          <div className="skills-list">
                            {application.student_skills?.map((skill, index) => (
                              <span key={index} className="skill-tag">
                                #{skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="cover-letter">
                          <h4>Cover Letter:</h4>
                          <p>{application.cover_letter}</p>
                        </div>
                      </div>

                      <div className="application-actions">
                        <div className="status-actions">
                          <select
                            value={application.status}
                            onChange={(e) =>
                              onUpdateApplicationStatus(
                                application.id,
                                e.target.value
                              )
                            }
                            className="status-select"
                            style={{
                              borderColor: getStatusColor(application.status),
                            }}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="shortlisted">✅ Shortlist</option>
                            <option value="rejected">❌ Reject</option>
                          </select>
                        </div>
                        <div className="action-buttons">
                          <button
                            className="view-profile-btn"
                            onClick={() => handleViewFullProfile(application)}
                          >
                            View Full Profile
                          </button>
                          <button className="contact-btn">Contact</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {myApplications.length === 0 && (
                  <div className="empty-state">
                    <h3>No applications yet</h3>
                    <p>
                      Applications will appear here when students apply to your
                      job postings
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="analytics-tab">
              <h2>📈 Recruitment Analytics</h2>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>Application Funnel</h3>
                  <div className="funnel-stats">
                    <div className="funnel-stage">
                      <span className="stage-name">Total Applications</span>
                      <span className="stage-count">
                        {myApplications.length}
                      </span>
                    </div>
                    <div className="funnel-stage">
                      <span className="stage-name">Pending Review</span>
                      <span className="stage-count">
                        {pendingApplications.length}
                      </span>
                    </div>
                    <div className="funnel-stage">
                      <span className="stage-name">Shortlisted</span>
                      <span className="stage-count">
                        {shortlistedApplications.length}
                      </span>
                    </div>
                    <div className="funnel-stage">
                      <span className="stage-name">Rejected</span>
                      <span className="stage-count">
                        {rejectedApplications.length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="analytics-card">
                  <h3>Top Skills</h3>
                  <div className="skills-analytics">
                    {(() => {
                      const skillCount = {};
                      myApplications.forEach((app) => {
                        app.student_skills?.forEach((skill) => {
                          skillCount[skill] = (skillCount[skill] || 0) + 1;
                        });
                      });
                      return Object.entries(skillCount)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([skill, count]) => (
                          <div key={skill} className="skill-stat">
                            <span className="skill-name">{skill}</span>
                            <span className="skill-count">{count}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Job Modal */}
      {showCreateJob && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Job Posting</h2>
              <button
                className="close-btn"
                onClick={() => setShowCreateJob(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="job-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Job Title *</label>
                  <input
                    type="text"
                    value={newJob.title}
                    onChange={(e) =>
                      setNewJob({ ...newJob, title: e.target.value })
                    }
                    required
                    placeholder="e.g., Financial Analyst Intern"
                  />
                </div>
                <div className="form-group">
                  <label>Job Type *</label>
                  <select
                    value={newJob.type}
                    onChange={(e) =>
                      setNewJob({ ...newJob, type: e.target.value })
                    }
                    required
                  >
                    <option value="Internship">Internship</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Full-time">Full-time</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) =>
                      setNewJob({ ...newJob, location: e.target.value })
                    }
                    required
                    placeholder="e.g., Lusaka or Remote"
                  />
                </div>
                <div className="form-group">
                  <label>Salary *</label>
                  <input
                    type="text"
                    value={newJob.salary}
                    onChange={(e) =>
                      setNewJob({ ...newJob, salary: e.target.value })
                    }
                    placeholder="ZK 2,500/month"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Required Skills (comma separated) *</label>
                <input
                  type="text"
                  value={newJob.skills}
                  onChange={(e) =>
                    setNewJob({ ...newJob, skills: e.target.value })
                  }
                  placeholder="Financial Analysis, Excel, Data Analysis, Risk Assessment"
                  required
                />
              </div>

              <div className="form-group">
                <label>Job Description *</label>
                <textarea
                  value={newJob.description}
                  onChange={(e) =>
                    setNewJob({ ...newJob, description: e.target.value })
                  }
                  rows="4"
                  placeholder="Describe the role, responsibilities, and what makes it exciting..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Requirements (one per line)</label>
                <textarea
                  value={newJob.requirements}
                  onChange={(e) =>
                    setNewJob({ ...newJob, requirements: e.target.value })
                  }
                  rows="4"
                  placeholder="Bachelor's degree in Finance/Economics&#10;Proficiency in Excel&#10;Understanding of financial markets"
                />
              </div>

              <div className="form-group">
                <label>Responsibilities (one per line)</label>
                <textarea
                  value={newJob.responsibilities}
                  onChange={(e) =>
                    setNewJob({ ...newJob, responsibilities: e.target.value })
                  }
                  rows="4"
                  placeholder="Analyze financial statements&#10;Prepare financial reports&#10;Assist with budget planning"
                />
              </div>

              <div className="form-group">
                <label>Experience Level *</label>
                <select
                  value={newJob.experience_level}
                  onChange={(e) =>
                    setNewJob({ ...newJob, experience_level: e.target.value })
                  }
                  required
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                </select>
              </div>

              <div className="form-group">
                <label>Field Category *</label>
                <select
                  value={newJob.field_category}
                  onChange={(e) =>
                    setNewJob({ ...newJob, field_category: e.target.value })
                  }
                  required
                >
                  <option value="">Select a field...</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="form-group">
                <label>Additional Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={newJob.keywords}
                  onChange={(e) =>
                    setNewJob({ ...newJob, keywords: e.target.value })
                  }
                  placeholder="e.g., agile, remote-friendly, startup"
                />
                <small className="help-text">
                  Add relevant terms to improve matching
                </small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateJob(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Job Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicant Profile Modal */}
      {showProfileModal && selectedApplication && (
        <div className="modal-overlay">
          <div
            className="modal-content profile-modal"
            style={{
              background: colors.background,
              color: colors.text,
            }}
          >
            <div
              className="modal-header"
              style={{ borderBottomColor: colors.border }}
            >
              <h2 style={{ color: colors.text }}>Applicant Profile</h2>
              <button
                className="close-btn"
                onClick={handleCloseProfileModal}
                style={{ color: colors.text }}
              >
                ×
              </button>
            </div>
            <div className="profile-content">
              <div
                className="profile-section"
                style={{ borderColor: colors.border }}
              >
                <h3
                  style={{
                    color: colors.text,
                    borderBottomColor: colors.border,
                  }}
                >
                  Personal Information
                </h3>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Full Name
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_name}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>Email</label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_email}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>Phone</label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_phone || "Not provided"}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Location
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_location || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="profile-section"
                style={{ borderColor: colors.border }}
              >
                <h3
                  style={{
                    color: colors.text,
                    borderBottomColor: colors.border,
                  }}
                >
                  Education
                </h3>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      University
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_university || "Not provided"}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Degree
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_degree || "Not provided"}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Graduation Year
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {selectedApplication.student_graduation_year ||
                        "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="profile-section"
                style={{ borderColor: colors.border }}
              >
                <h3
                  style={{
                    color: colors.text,
                    borderBottomColor: colors.border,
                  }}
                >
                  Skills & Expertise
                </h3>
                <div className="skills-list">
                  {selectedApplication.student_skills?.map((skill, index) => (
                    <span
                      key={index}
                      className="skill-tag-large"
                      style={{
                        background: theme === "light" ? "#e8f4fd" : "#2d3748",
                        color: theme === "light" ? "#1e40af" : "#90cdf4",
                        borderColor: theme === "light" ? "#bee3f8" : "#4a5568",
                      }}
                    >
                      #{skill}
                    </span>
                  ))}
                  {(!selectedApplication.student_skills ||
                    selectedApplication.student_skills.length === 0) && (
                    <p style={{ color: colors.textSecondary }}>
                      No skills listed
                    </p>
                  )}
                </div>
              </div>

              <div
                className="profile-section"
                style={{ borderColor: colors.border }}
              >
                <h3
                  style={{
                    color: colors.text,
                    borderBottomColor: colors.border,
                  }}
                >
                  Resume & Portfolio
                </h3>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Resume
                    </label>
                    {selectedApplication.student_resume_url ? (
                      <a
                        href={selectedApplication.student_resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link"
                        style={{
                          background: theme === "light" ? "#e8f4fd" : "#2d3748",
                          color: theme === "light" ? "#1e40af" : "#90cdf4",
                          borderColor:
                            theme === "light" ? "#bee3f8" : "#4a5568",
                        }}
                      >
                        📄 View Resume
                      </a>
                    ) : (
                      <p style={{ color: colors.textSecondary }}>
                        No resume uploaded
                      </p>
                    )}
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Portfolio
                    </label>
                    {selectedApplication.student_portfolio_url ? (
                      <a
                        href={selectedApplication.student_portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link"
                        style={{
                          background: theme === "light" ? "#e8f4fd" : "#2d3748",
                          color: theme === "light" ? "#1e40af" : "#90cdf4",
                          borderColor:
                            theme === "light" ? "#bee3f8" : "#4a5568",
                        }}
                      >
                        🌐 View Portfolio
                      </a>
                    ) : (
                      <p style={{ color: colors.textSecondary }}>
                        No portfolio provided
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="profile-section"
                style={{ borderColor: colors.border }}
              >
                <h3
                  style={{
                    color: colors.text,
                    borderBottomColor: colors.border,
                  }}
                >
                  Cover Letter
                </h3>
                <div
                  className="cover-letter-content"
                  style={{
                    background: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <p>
                    {selectedApplication.cover_letter ||
                      "No cover letter provided"}
                  </p>
                </div>
              </div>

              <div
                className="profile-section"
                style={{ borderColor: colors.border }}
              >
                <h3
                  style={{
                    color: colors.text,
                    borderBottomColor: colors.border,
                  }}
                >
                  Application Details
                </h3>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Applied Position
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {jobs.find((j) => j.id === selectedApplication.job_id)
                        ?.title || "Unknown Position"}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Applied Date
                    </label>
                    <p
                      style={{
                        background: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {new Date(
                        selectedApplication.applied_date
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label style={{ color: colors.textSecondary }}>
                      Current Status
                    </label>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(
                          selectedApplication.status
                        ),
                        color: theme === "light" ? "white" : "#1a202c",
                        fontWeight: "bold",
                      }}
                    >
                      {selectedApplication.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="modal-actions"
              style={{
                borderTopColor: colors.border,
                background: colors.surface,
              }}
            >
              <button
                className="contact-btn"
                style={{
                  background: colors.primary,
                  color: "white",
                }}
              >
                📧 Contact Applicant
              </button>
              <button
                className="close-modal-btn"
                onClick={handleCloseProfileModal}
                style={{
                  background: theme === "light" ? "#6c757d" : "#4a5568",
                  color: "white",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tutorial Overlay */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-spotlight-container">
            {tutorialSteps[currentTutorialStep] && (
              <div
                className="tutorial-spotlight"
                style={{
                  position: "fixed",
                  top: "0",
                  left: "0",
                  width: "100%",
                  height: "100%",
                  zIndex: 1000,
                }}
              >
                <div
                  className={`tutorial-tooltip ${tutorialSteps[currentTutorialStep].position}`}
                  style={{
                    position: "fixed",
                    zIndex: 1001,
                  }}
                >
                  <h3>{tutorialSteps[currentTutorialStep].title}</h3>
                  <p>{tutorialSteps[currentTutorialStep].content}</p>
                  <div className="tutorial-controls">
                    <div className="tutorial-progress">
                      {tutorialSteps.map((_, index) => (
                        <span
                          key={index}
                          className={`progress-dot ${
                            currentTutorialStep === index ? "active" : ""
                          }`}
                          onClick={() => setCurrentTutorialStep(index)}
                        />
                      ))}
                    </div>
                    <div className="tutorial-buttons">
                      {currentTutorialStep > 0 && (
                        <button
                          onClick={handleTutorialPrev}
                          className="tutorial-btn"
                        >
                          ← Previous
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (currentTutorialStep < tutorialSteps.length - 1) {
                            handleTutorialNext();
                          } else {
                            completeTutorial();
                          }
                        }}
                        className="tutorial-btn primary"
                      >
                        {currentTutorialStep < tutorialSteps.length - 1
                          ? "Next →"
                          : "Finish"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="tutorial-skip-btn" onClick={completeTutorial}>
            Skip Tutorial
          </button>
        </div>
      )}

      {/* Updated CSS for better theme support */}
      <style jsx>{`
        /* Interactive Tutorial Styles */
        .tutorial-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 9998;
          pointer-events: all;
        }

        .tutorial-spotlight-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          pointer-events: none;
        }

        .tutorial-spotlight {
          position: fixed;
          pointer-events: none;
          animation: spotlight-fade-in 0.3s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tutorial-spotlight::before {
          content: "";
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid ${colors.primary};
          border-radius: 4px;
          animation: spotlight-pulse 2s infinite;
        }

        .tutorial-tooltip {
          position: fixed;
          background: ${colors.background};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          padding: 1rem;
          width: 300px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          pointer-events: all;
          animation: tooltip-fade-in 0.3s ease-out;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
        }

        .tutorial-tooltip h3 {
          margin: 0 0 0.5rem 0;
          color: ${colors.primary};
          font-size: 1.1rem;
        }

        .tutorial-tooltip p {
          margin: 0 0 1rem 0;
          color: ${colors.text};
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .tutorial-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tutorial-progress {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${colors.border};
          cursor: pointer;
          transition: all 0.2s;
        }

        .progress-dot.active {
          background: ${colors.primary};
          transform: scale(1.2);
        }

        .tutorial-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .tutorial-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
          background: ${colors.surface};
          color: ${colors.text};
        }

        .tutorial-btn.primary {
          background: ${colors.primary};
          color: white;
        }

        .tutorial-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .tutorial-skip-btn {
          position: fixed;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .tutorial-skip-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .tutorial-tooltip.top {
          bottom: calc(100% + 20px);
          left: 50%;
          transform: translateX(-50%);
        }

        .tutorial-tooltip.bottom {
          top: calc(100% + 20px);
          left: 50%;
          transform: translateX(-50%);
        }

        .tutorial-tooltip.left {
          right: calc(100% + 20px);
          top: 50%;
          transform: translateY(-50%);
        }

        .tutorial-tooltip.right {
          left: calc(100% + 20px);
          top: 50%;
          transform: translateY(-50%);
        }

        @keyframes spotlight-fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spotlight-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 123, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
          }
        }

        .profile-modal {
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .profile-content {
          padding: 1rem;
        }

        .profile-section {
          margin-bottom: 2rem;
          padding: 1rem;
          border-radius: 8px;
        }

        .profile-section h3 {
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom-width: 2px;
          border-bottom-style: solid;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .profile-field {
          margin-bottom: 1rem;
        }

        .profile-field label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }

        .profile-field p {
          margin: 0;
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid;
        }

        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .skill-tag-large {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          border: 1px solid;
        }

        .file-link {
          display: inline-block;
          padding: 0.5rem 1rem;
          text-decoration: none;
          border-radius: 4px;
          border: 1px solid;
          transition: all 0.2s;
          font-weight: 500;
        }

        .file-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .cover-letter-content {
          padding: 1rem;
          border-radius: 4px;
          border: 1px solid;
          max-height: 200px;
          overflow-y: auto;
        }

        .cover-letter-content p {
          margin: 0;
          line-height: 1.6;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1rem;
          border-top: 1px solid;
        }

        .contact-btn,
        .close-modal-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .contact-btn:hover,
        .close-modal-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          display: inline-block;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default RecruiterDashboard;
