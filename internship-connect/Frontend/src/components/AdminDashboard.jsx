import React, { useState, useEffect } from 'react'
import { adminAPI } from '../services/api'

const AdminDashboard = ({ user, onLogout, theme, toggleTheme, onRefetchData }) => {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadAdminData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError('')
      
      const [statsResponse, usersResponse, jobsResponse, applicationsResponse] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getJobs(),
        adminAPI.getApplications()
      ])

      setStats(statsResponse.data)
      setUsers(usersResponse.data)
      setJobs(jobsResponse.data)
      setApplications(applicationsResponse.data)
      
    } catch (error) {
      console.error('Error loading admin data:', error)
      setError('Failed to load admin data. Please check your connection.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await adminAPI.deleteUser(userId)
        setMessage(`User "${userName}" deleted successfully`)
        // Update local state immediately
        setUsers(prev => prev.filter(user => user.id !== userId))
        // Refresh global data
        if (onRefetchData) onRefetchData()
      } catch (error) {
        console.error('Error deleting user:', error)
        setError('Failed to delete user')
      }
    }
  }

  const handleDeleteJob = async (jobId, jobTitle) => {
    if (window.confirm(`Are you sure you want to delete job "${jobTitle}"?`)) {
      try {
        await adminAPI.deleteJob(jobId)
        setMessage(`Job "${jobTitle}" deleted successfully`)
        // Update local state immediately
        setJobs(prev => prev.filter(job => job.id !== jobId))
        // Refresh global data
        if (onRefetchData) onRefetchData()
      } catch (error) {
        console.error('Error deleting job:', error)
        setError('Failed to delete job')
      }
    }
  }

  const handleUpdateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await adminAPI.updateApplication(applicationId, { status: newStatus })
      setMessage(`Application status updated to ${newStatus}`)
      // Update local state immediately
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      )
    } catch (error) {
      console.error('Error updating application:', error)
      setError('Failed to update application status')
    }
  }

  // Filter data based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredApplications = applications.filter(app =>
    app.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    loadAdminData()
  }, [])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('')
        setError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message, error])

  if (loading && !stats) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🔄</div>
        <p>Loading Admin Dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Admin Dashboard</h1>
            <span className="user-welcome">Welcome back, {user.name}</span>
          </div>
          <div className="header-right">
            <button 
              onClick={() => loadAdminData(false)} 
              disabled={refreshing}
              className={`refresh-header-btn ${refreshing ? 'refreshing' : ''}`}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Messages */}
        {message && (
          <div className="message success">
            {message}
          </div>
        )}
        {error && (
          <div className="message error">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search users, jobs, applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="clear-search">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="tab-icon">📊</span>
              Overview
            </button>
            <button 
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className="tab-icon">👥</span>
              Users
              <span className="tab-count">{users.length}</span>
            </button>
            <button 
              className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              <span className="tab-icon">💼</span>
              Jobs
              <span className="tab-count">{jobs.length}</span>
            </button>
            <button 
              className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              <span className="tab-icon">📝</span>
              Applications
              <span className="tab-count">{applications.length}</span>
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="tab-content">
            <div className="stats-grid">
              {/* Total Users Card */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>Total Users</h3>
                    <div className="stat-number">
                      {stats.users.reduce((acc, user) => acc + parseInt(user.count), 0)}
                    </div>
                  </div>
                </div>
                <div className="stat-breakdown">
                  {stats.users.map(userType => (
                    <div key={userType.type} className="breakdown-item">
                      <span className="breakdown-label">{userType.type}</span>
                      <span className="breakdown-value">{userType.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Jobs Card */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">💼</div>
                  <div className="stat-info">
                    <h3>Total Jobs</h3>
                    <div className="stat-number">{stats.jobs.total_jobs}</div>
                  </div>
                </div>
                <div className="stat-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Active</span>
                    <span className="breakdown-value">{stats.jobs.active_jobs}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Inactive</span>
                    <span className="breakdown-value">{stats.jobs.inactive_jobs}</span>
                  </div>
                </div>
              </div>

              {/* Applications Card */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">📝</div>
                  <div className="stat-info">
                    <h3>Applications</h3>
                    <div className="stat-number">{stats.applications.total_applications}</div>
                  </div>
                </div>
                <div className="stat-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Pending</span>
                    <span className="breakdown-value status-pending">{stats.applications.pending_applications}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Shortlisted</span>
                    <span className="breakdown-value status-shortlisted">{stats.applications.shortlisted_applications}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Rejected</span>
                    <span className="breakdown-value status-rejected">{stats.applications.rejected_applications}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-info">
                    <h3>Recent Activity</h3>
                    <div className="stat-number">{stats.recent.users + stats.recent.jobs}</div>
                  </div>
                </div>
                <div className="stat-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">New Users (7d)</span>
                    <span className="breakdown-value">{stats.recent.users}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">New Jobs (7d)</span>
                    <span className="breakdown-value">{stats.recent.jobs}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions-grid">
                <button 
                  onClick={() => setActiveTab('users')}
                  className="quick-action-btn"
                >
                  <span className="action-icon">👥</span>
                  <span className="action-text">Manage Users</span>
                </button>
                <button 
                  onClick={() => setActiveTab('jobs')}
                  className="quick-action-btn"
                >
                  <span className="action-icon">💼</span>
                  <span className="action-text">Manage Jobs</span>
                </button>
                <button 
                  onClick={() => setActiveTab('applications')}
                  className="quick-action-btn"
                >
                  <span className="action-icon">📝</span>
                  <span className="action-text">Manage Applications</span>
                </button>
                <button 
                  onClick={() => loadAdminData(false)}
                  disabled={refreshing}
                  className="quick-action-btn"
                >
                  <span className="action-icon">🔄</span>
                  <span className="action-text">
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>User Management</h2>
              <div className="tab-info">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{user.name}</div>
                            <div className="user-id">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`user-type ${user.type}`}>
                          {user.type}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="btn-danger"
                            disabled={user.id === user.id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>No users found</h3>
                  <p>No users match your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Job Management</h2>
              <div className="tab-info">
                Showing {filteredJobs.length} of {jobs.length} jobs
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job Details</th>
                    <th>Company</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Posted By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(job => (
                    <tr key={job.id}>
                      <td>
                        <div className="job-cell">
                          <div className="job-title">{job.title}</div>
                          {job.salary && (
                            <div className="job-salary">{job.salary}</div>
                          )}
                        </div>
                      </td>
                      <td>{job.company}</td>
                      <td>
                        <span className="job-type">{job.type}</span>
                      </td>
                      <td>{job.location}</td>
                      <td>
                        <div className="poster-info">
                          <div className="poster-name">{job.poster_name || 'Unknown'}</div>
                          <div className="poster-email">{job.poster_email || ''}</div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleDeleteJob(job.id, job.title)}
                            className="btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredJobs.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">💼</div>
                  <h3>No jobs found</h3>
                  <p>No jobs match your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Application Management</h2>
              <div className="tab-info">
                Showing {filteredApplications.length} of {applications.length} applications
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Student</th>
                    <th>Recruiter</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map(app => (
                    <tr key={app.id}>
                      <td>
                        <div className="application-cell">
                          <div className="application-title">{app.job_title}</div>
                          <div className="application-company">{app.company}</div>
                        </div>
                      </td>
                      <td>
                        <div className="student-cell">
                          <div className="student-name">{app.student_name}</div>
                          <div className="student-email">{app.student_email}</div>
                        </div>
                      </td>
                      <td>
                        <div className="recruiter-cell">
                          <div className="recruiter-name">{app.recruiter_name || 'Unknown'}</div>
                          <div className="recruiter-email">{app.recruiter_email || ''}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`status ${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{new Date(app.applied_date).toLocaleDateString()}</td>
                      <td>
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                          className="status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredApplications.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>No applications found</h3>
                  <p>No applications match your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="admin-actions">
          <button 
            onClick={() => loadAdminData(false)} 
            disabled={refreshing} 
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          >
            {refreshing ? '🔄 Refreshing Data...' : '🔄 Refresh All Data'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard