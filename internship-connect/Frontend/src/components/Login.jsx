import React, { useState } from 'react'
import { BsSun, BsMoonStars } from 'react-icons/bs'

const Login = ({ onLogin, onRegister, onPasswordReset, theme, toggleTheme, loading }) => {
  const [mode, setMode] = useState('login') // 'login', 'register', 'forgot'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student',
    // Student specific fields
    phone: '',
    location: '',
    university: '',
    degree: '',
    graduationYear: '',
    // Organization specific fields
    company: '',
    industry: '',
    size: '',
    description: ''
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const validateForm = () => {
    const newErrors = {}

    if (mode === 'register') {
      if (!formData.name.trim()) newErrors.name = 'Full name is required'
      
      if (formData.userType === 'student') {
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
        if (!formData.location.trim()) newErrors.location = 'Location is required'
        if (!formData.university.trim()) newErrors.university = 'University is required'
        if (!formData.degree.trim()) newErrors.degree = 'Program is required'
        if (!formData.graduationYear.trim()) newErrors.graduationYear = 'Graduation year is required'
      } else if (formData.userType === 'organization') {
        if (!formData.company.trim()) newErrors.company = 'Company name is required'
        if (!formData.industry.trim()) newErrors.industry = 'Industry is required'
        if (!formData.size.trim()) newErrors.size = 'Company size is required'
        if (!formData.location.trim()) newErrors.location = 'Location is required'
        if (!formData.description.trim()) newErrors.description = 'Company description is required'
      }
      // Admin doesn't need additional fields validation
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setMessage('')

    if (!validateForm()) return

    try {
      if (mode === 'login') {
        // Do not send userType on login; server returns actual user type based on credentials
        const result = await onLogin({ 
          email: formData.email, 
          password: formData.password
        })
        if (!result.success) {
          setErrors({ general: result.message })
        }
      } else if (mode === 'register') {
        const userData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          type: formData.userType
        }

        // Add type-specific fields
        if (formData.userType === 'student') {
          Object.assign(userData, {
            phone: formData.phone,
            location: formData.location,
            university: formData.university,
            degree: formData.degree,
            graduationYear: formData.graduationYear
          })
        } else if (formData.userType === 'organization') {
          Object.assign(userData, {
            company: formData.company,
            industry: formData.industry,
            size: formData.size,
            location: formData.location,
            description: formData.description
          })
        }
        // Admin doesn't need additional fields

        const result = await onRegister(userData)
        if (result.success) {
          setMessage(result.message)
        } else {
          setErrors({ general: result.message })
        }
      } else if (mode === 'forgot') {
        // Forgot password logic
        const newPassword = 'newpassword123'
        onPasswordReset(formData.email, newPassword)
        setMessage(`Password reset! Your new password is: ${newPassword}`)
        setMode('login')
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'student',
      phone: '',
      location: '',
      university: '',
      degree: '',
      graduationYear: '',
      company: '',
      industry: '',
      size: '',
      description: ''
    })
    setErrors({})
    setMessage('')
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    resetForm()
  }

  const renderStudentFields = () => (
    <>
      <div className="form-group">
        <label className="form-label">Phone Number</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className={`form-input ${errors.phone ? 'error' : ''}`}
          placeholder="+260 XXX XXX XXX"
          required
        />
        {errors.phone && <span className="error-text">{errors.phone}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          className={`form-input ${errors.location ? 'error' : ''}`}
          placeholder="Lusaka, Zambia"
          required
        />
        {errors.location && <span className="error-text">{errors.location}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">University</label>
        <input
          type="text"
          value={formData.university}
          onChange={(e) => setFormData({...formData, university: e.target.value})}
          className={`form-input ${errors.university ? 'error' : ''}`}
          placeholder="Dmi.St.Eugene University"
          required
        />
        {errors.university && <span className="error-text">{errors.university}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Program</label>
        <input
          type="text"
          value={formData.degree}
          onChange={(e) => setFormData({...formData, degree: e.target.value})}
          className={`form-input ${errors.degree ? 'error' : ''}`}
          placeholder="e.g., Bachelor of Computer Science"
          required
        />
        {errors.degree && <span className="error-text">{errors.degree}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Graduation Year</label>
        <input
          type="number"
          value={formData.graduationYear}
          onChange={(e) => setFormData({...formData, graduationYear: e.target.value})}
          className={`form-input ${errors.graduationYear ? 'error' : ''}`}
          placeholder="2024"
          min="2020"
          max="2030"
          required
        />
        {errors.graduationYear && <span className="error-text">{errors.graduationYear}</span>}
      </div>
    </>
  )

  const renderOrganizationFields = () => (
    <>
      <div className="form-group">
        <label className="form-label">Company Name</label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData({...formData, company: e.target.value})}
          className={`form-input ${errors.company ? 'error' : ''}`}
          placeholder="Tech Corp Zambia"
          required
        />
        {errors.company && <span className="error-text">{errors.company}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Industry</label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
          className={`form-input ${errors.industry ? 'error' : ''}`}
          required
        >
          <option value="">Select Industry</option>
          <option value="Technology">Technology</option>
          <option value="Finance">Finance</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Education">Education</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Retail">Retail</option>
          <option value="Other">Other</option>
        </select>
        {errors.industry && <span className="error-text">{errors.industry}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Company Size</label>
        <select
          value={formData.size}
          onChange={(e) => setFormData({...formData, size: e.target.value})}
          className={`form-input ${errors.size ? 'error' : ''}`}
          required
        >
          <option value="">Select Size</option>
          <option value="1-10 employees">1-10 employees</option>
          <option value="11-50 employees">11-50 employees</option>
          <option value="51-200 employees">51-200 employees</option>
          <option value="201-500 employees">201-500 employees</option>
          <option value="501-1000 employees">501-1000 employees</option>
          <option value="1000+ employees">1000+ employees</option>
        </select>
        {errors.size && <span className="error-text">{errors.size}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          className={`form-input ${errors.location ? 'error' : ''}`}
          placeholder="Lusaka, Zambia"
          required
        />
        {errors.location && <span className="error-text">{errors.location}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Company Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className={`form-input ${errors.description ? 'error' : ''}`}
          placeholder="Brief description of your company..."
          rows="3"
          required
        />
        {errors.description && <span className="error-text">{errors.description}</span>}
      </div>
    </>
  )

  return (
    <div className="login-container">
      <div className="theme-toggle-container">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {theme === 'light' ? <BsMoonStars /> : <BsSun />}
          <span>{theme === 'light' ? ' Dark' : ' Light'}</span>
        </button>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <h1>InternConnect</h1>
          <p className="login-subtitle">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {message && (
          <div className="message success">
            {message}
          </div>
        )}

        {errors.general && (
          <div className="message error">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'forgot' ? (
            <>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="form-footer">
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => switchMode('login')}
                >
                  ← Back to Sign In
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Account type selector removed from login view; available only when registering */}

              {mode === 'register' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <select
                      value={formData.userType}
                      onChange={(e) => setFormData({...formData, userType: e.target.value})}
                      className="form-select"
                    >
                      <option value="student">Student</option>
                      <option value="organization">Recruiter</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`form-input ${errors.name ? 'error' : ''}`}
                      required
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>

                  {/* Conditionally render fields based on user type - ONLY FOR REGISTRATION */}
                  {formData.userType === 'student' && renderStudentFields()}
                  {formData.userType === 'organization' && renderOrganizationFields()}
                  {/* Admin doesn't need additional fields */}
                </>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <div className="password-label-container">
                  <label className="form-label">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      className="link-btn"
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  required
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    required
                  />
                  {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                </div>
              )}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="form-footer">
                {mode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button 
                      type="button" 
                      className="link-btn"
                      onClick={() => switchMode('register')}
                    >
                      Sign up here
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button 
                      type="button" 
                      className="link-btn"
                      onClick={() => switchMode('login')}
                    >
                      Sign in here
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

export default Login