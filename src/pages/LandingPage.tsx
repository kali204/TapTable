import { Link } from 'react-router-dom'
import { Smartphone, Zap, Users, CheckCircle, ArrowRight, Star, Play, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import './CSS/LandingPage.css'

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    setIsVisible(true)
    
    // Auto-rotate features
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: <Smartphone className="w-12 h-12" />,
      title: "QR Code Ordering",
      description: "Instant menu access with QR scanning",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: "Lightning Fast",
      description: "Orders processed in real-time",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Boost Efficiency",
      description: "Reduce staff workload by 60%",
      color: "from-pink-500 to-orange-600"
    }
  ]

  const stats = [
    { number: "--", label: "Happy Restaurants" },
    { number: "--", label: "Orders Processed" },
    { number: "--", label: "Customer Rating" },
    { number: "--", label: "Cost Reduction" }
  ]

  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="bg-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`navbar ${isVisible ? 'nav-visible' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-icon">
              <span className="logo-text">T</span>
              <div className="logo-pulse"></div>
            </div>
            <span className="brand-name">TapTable</span>
          </div>
          
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <Link to="/admin/login" className="login-btn">
              Restaurant Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className={`hero-content ${isVisible ? 'hero-visible' : ''}`}>
            <div className="hero-badge">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Trusted by 10,000+ Restaurants</span>
            </div>
            
            <h1 className="hero-title">
              Transform Your
              <span className="gradient-text"> Restaurant Experience</span>
              <br />
              with Smart QR Ordering
            </h1>
            
            <p className="hero-description">
              Eliminate wait times, reduce operational costs, and create seamless dining experiences 
              that your customers will love. Join the digital revolution today.
            </p>
            
            <div className="hero-actions">
              <Link to="/admin/login" className="cta-primary">
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <button className="cta-secondary">
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </button>
            </div>
            
            {/* Stats */}
            <div className="hero-stats">
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={`hero-visual ${isVisible ? 'visual-visible' : ''}`}>
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="menu-demo">
                  <div className="demo-header">
                    <div className="demo-logo">TapTable Menu</div>
                    <div className="table-badge">Table 7</div>
                  </div>
                  <div className="demo-items">
                    <div className="demo-item active">
                      <div className="item-image"></div>
                      <div className="item-info">
                        <div className="item-name">Margherita Pizza</div>
                        <div className="item-price">₹299</div>
                      </div>
                      <div className="add-btn">+</div>
                    </div>
                    <div className="demo-item">
                      <div className="item-image"></div>
                      <div className="item-info">
                        <div className="item-name">Caesar Salad</div>
                        <div className="item-price">₹199</div>
                      </div>
                      <div className="add-btn">+</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="floating-elements">
              <div className="floating-card card-1">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span>Order Confirmed!</span>
              </div>
              <div className="floating-card card-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                <span>60% Faster Service</span>
              </div>
              <div className="floating-card card-3">
                <Users className="w-6 h-6 text-blue-500" />
                <span>Happy Customers</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="scroll-indicator">
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-description">
              Everything you need to revolutionize your restaurant operations
            </p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`feature-card ${activeFeature === index ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`feature-icon bg-gradient-to-br ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-glow"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">How TapTable Works</h2>
            <p className="section-description">
              Get started in minutes, not hours
            </p>
          </div>
          
          <div className="steps-container">
            <div className="steps-visual">
              <div className="step-line"></div>
              
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="step-node">
                  <div className="step-number">{step}</div>
                  <div className="step-pulse"></div>
                </div>
              ))}
            </div>
            
            <div className="steps-content">
              <div className="step-item">
                <h4 className="step-title">Create Your Account</h4>
                <p className="step-description">Sign up in 30 seconds and access your dashboard</p>
              </div>
              <div className="step-item">
                <h4 className="step-title">Setup Your Menu</h4>
                <p className="step-description">Add items, prices, and photos with our intuitive interface</p>
              </div>
              <div className="step-item">
                <h4 className="step-title">Generate QR Codes</h4>
                <p className="step-description">Create unique QR codes for each table instantly</p>
              </div>
              <div className="step-item">
                <h4 className="step-title">Start Serving</h4>
                <p className="step-description">Customers scan, order, and pay seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Restaurant?</h2>
            <p className="cta-description">
              Join thousands of restaurants already using TapTable to delight customers and boost profits
            </p>
            <Link to="/admin/login" className="cta-button">
              <span>Start Your Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="cta-bg-effects">
            <div className="effect-circle circle-1"></div>
            <div className="effect-circle circle-2"></div>
            <div className="effect-circle circle-3"></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="logo-icon">
                <span className="logo-text">T</span>
              </div>
              <span className="brand-name">TapTable</span>
            </div>
            <p className="footer-description">
              Revolutionizing restaurant experiences with smart QR ordering technology
            </p>
          </div>
          
          <div className="footer-links">
            <div className="link-group">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#demo">Demo</a>
            </div>
            <div className="link-group">
              <h5>Company</h5>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#careers">Careers</a>
            </div>
            <div className="link-group">
              <h5>Support</h5>
              <a href="#help">Help Center</a>
              <a href="#docs">Documentation</a>
              <a href="#api">API</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 TapTable. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
