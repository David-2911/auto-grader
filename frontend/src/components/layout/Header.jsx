import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Header component with navigation links
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {Function} props.onLogout - Logout handler function
 * @returns {React.ReactElement} Header component
 */
const Header = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  return (
    <header className="header">
      <div className="navbar">
        <Link to="/" className="logo">Auto-Grade System</Link>
        
        <button className="mobile-menu-btn" onClick={toggleMenu}>
          <span className="material-icons">menu</span>
        </button>
        
        <nav className={`nav-links ${menuOpen ? 'active' : ''}`}>
          {user ? (
            // Authenticated navigation links
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              
              {/* Student-specific links */}
              {user.role === 'student' && (
                <>
                  <Link to="/courses" className="nav-link">My Courses</Link>
                  <Link to="/assignments" className="nav-link">Assignments</Link>
                </>
              )}
              
              {/* Teacher-specific links */}
              {user.role === 'teacher' && (
                <>
                  <Link to="/courses" className="nav-link">My Courses</Link>
                  <Link to="/assignments" className="nav-link">Assignments</Link>
                </>
              )}
              
              {/* Admin-specific links */}
              {user.role === 'admin' && (
                <>
                  <Link to="/courses" className="nav-link">Courses</Link>
                  <Link to="/users" className="nav-link">Users</Link>
                </>
              )}
              
              {/* Common authenticated links */}
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={handleLogout} className="nav-link">Logout</button>
            </>
          ) : (
            // Unauthenticated navigation links
            <>
              <Link to="/login" className="nav-link">Student Login</Link>
              <Link to="/register" className="nav-link">Student Register</Link>
              <Link to="/teacher/login" className="nav-link">Teacher Login</Link>
              <Link to="/admin/login" className="nav-link">Admin Login</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
