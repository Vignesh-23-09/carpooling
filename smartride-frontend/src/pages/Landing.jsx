import { Link } from 'react-router-dom'
import { Car, Shield, Zap, Users, ArrowRight } from 'lucide-react'
import './Landing.css'
import carImage from '../assets/image.webp'

export default function Landing() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid" />
        </div>
        <div className="hero-content fade-up">
          <div className="hero-badge">
            <Zap size={12} />
            Smart Carpooling Platform
          </div>
          <h1 className="hero-title">
            Share the ride,<br />
            <span className="hero-accent">split the cost</span>
          </h1>
          <p className="hero-subtitle">
            Connect with verified drivers and passengers going your way.
            Book rides instantly, travel smarter, save more.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="sr-btn sr-btn-primary hero-cta">
              Start Riding <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="sr-btn sr-btn-ghost">
              Sign In
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">10K+</span>
              <span className="stat-label">Rides</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">5K+</span>
              <span className="stat-label">Users</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">50+</span>
              <span className="stat-label">Cities</span>
            </div>
          </div>
        </div>

        {/* Car Image */}
        <div className="hero-car-container fade-up">
          <img src={carImage} alt="SmartRide Car" className="hero-car-image" />
          
          <div className="hero-car-stats">
            <div className="stat-item">
              <div className="stat-value">2.5K+</div>
              <div className="stat-text">Active Rides</div>
            </div>
            <div className="stat-divider-v" />
            <div className="stat-item">
              <div className="stat-value">₹10L+</div>
              <div className="stat-text">Saved Together</div>
            </div>
            <div className="stat-divider-v" />
            <div className="stat-item">
              <div className="stat-value">98%</div>
              <div className="stat-text">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-inner">
          <h2 className="section-title">Why SmartRide?</h2>
          <p className="section-sub">Everything you need for a smooth ride sharing experience</p>
          <div className="features-grid">
            {[
              { icon: <Shield size={24} />, title: 'Verified Users', desc: 'Email OTP verification ensures every user on our platform is real and trusted.' },
              { icon: <Zap size={24} />, title: 'Instant Booking', desc: 'Find and book rides in seconds. Real-time seat availability so you never miss a ride.' },
              { icon: <Car size={24} />, title: 'Driver Control', desc: 'Drivers post rides, set their own price and capacity. Full control over your journey.' },
              { icon: <Users size={24} />, title: 'Community First', desc: 'Connect with people going your way. Share costs, reduce emissions, build community.' },
            ].map((f, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready to ride smarter?</h2>
          <p>Join thousands of commuters saving money every day.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/register?role=PASSENGER" className="sr-btn sr-btn-primary">
              I need a ride <ArrowRight size={16} />
            </Link>
            <Link to="/register?role=DRIVER" className="sr-btn sr-btn-ghost">
              I'm a driver
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
