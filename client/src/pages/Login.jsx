import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Particles from "react-particles";
import { loadFull } from "tsparticles";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { login } = useAuth();
  const navigate = useNavigate();

  // Track mouse movement for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const particlesInit = useCallback(async (engine) => {
    try {
      await loadFull(engine);
    } catch (error) {
      console.error('Error initializing particles:', error);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900 perspective-1000">
      {/* Background Image with Parallax Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-100 ease-out"
        style={{ 
          backgroundImage: 'url(/background_image.jpg)',
          filter: 'brightness(0.5) contrast(1.2)',
          transform: `scale(1.1) translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`,
        }}
      />
      
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-[#7e22ce]/70 to-[#9222ce]/70 animate-gradient-shift"></div>
      
      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${Math.random() * 180 + 50}px`,
              height: `${Math.random() * 180 + 50}px`,
              left: `${Math.random() * 90}%`,
              top: `${Math.random() * 90}%`,
              backgroundColor: i % 2 === 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(126, 34, 206, 0.15)',
              backdropFilter: 'blur(8px)',
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              zIndex: 0
            }}
          />
        ))}
      </div>
      
      {/* Golden Sparkle Particles */}
      <Particles
        className="absolute inset-0"
        id="tsparticles"
        init={particlesInit}
        options={{
          background: {
            opacity: 0
          },
          particles: {
            number: {
              value: 100,
              density: {
                enable: true,
                value_area: 1000
              }
            },
            color: {
              value: ["#fbbf24", "#fde68a", "#fef3c7"]
            },
            links: {
              enable: true,
              color: "#fbbf24",
              opacity: 0.15,
              distance: 150,
              width: 0.8
            },
            move: {
              enable: true,
              speed: 0.8,
              direction: "none",
              random: true,
              straight: false,
              outModes: {
                default: "out"
              }
            },
            size: {
              value: { min: 1, max: 3 }
            },
            opacity: {
              value: { min: 0.3, max: 0.7 },
              animation: {
                enable: true,
                speed: 0.5,
                minimumValue: 0.1,
                sync: false
              }
            },
            shape: {
              type: "circle"
            },
            twinkle: {
              particles: {
                enable: true,
                frequency: 0.05,
                opacity: 1
              }
            },
            wobble: {
              enable: true,
              distance: 5,
              speed: 5
            }
          },
          interactivity: {
            detectsOn: "window",
            events: {
              onHover: {
                enable: true,
                mode: "connect"
              },
              onClick: {
                enable: true,
                mode: "push"
              }
            },
            modes: {
              connect: {
                radius: 150,
                links: {
                  opacity: 0.2
                }
              },
              push: {
                quantity: 4
              }
            }
          },
          detectRetina: true
        }}
      />

      {/* Login Card with Glassmorphism */}
      <div 
        className="relative bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/10 transform hover:scale-[1.02] transition-all duration-300 z-10"
        style={{
          boxShadow: '0 25px 50px -12px rgba(126, 34, 206, 0.5), 0 0 40px rgba(251, 191, 36, 0.2) inset',
          transform: `translateX(${mousePosition.x * -15}px) translateY(${mousePosition.y * -15}px)`,
        }}
      >
        {/* Animated Corner Lines */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-yellow-400/60 rounded-tl-2xl"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-yellow-400/60 rounded-tr-2xl"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-yellow-400/60 rounded-bl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-yellow-400/60 rounded-br-2xl"></div>
        
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <img 
              src="/logo.svg" 
              alt="EZTransport Logo" 
              className="w-20 h-20 mx-auto drop-shadow-lg rotate-logo"
            />
            <div className="absolute -inset-2 rounded-full bg-yellow-400/20 blur-md animate-pulse"></div>
            {/* Orbit animation around logo */}
            <div className="absolute inset-0 rounded-full orbit">
              <div className="h-2 w-2 absolute rounded-full bg-yellow-400/80"></div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 animate-text-shimmer">
              EZTransport
            </span>
            <span className="absolute -top-2 -right-2 text-xs px-2 py-1 bg-gradient-to-r from-[#7e22ce] to-[#9222ce] rounded-full text-white font-normal animate-pulse">
              DBMS
            </span>
          </h1>
          <p className="text-white/80 text-lg font-light">
            Transport and Logistics Management System
            <span className="inline-block ml-2 animate-bounce">🌐</span>
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 text-red-100 rounded-xl backdrop-blur-sm animate-shake">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/80 mb-2 text-sm font-medium">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-user text-yellow-400/80 group-hover:text-yellow-300 transition-colors duration-200"></i>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400/50 transition-all duration-200 hover:border-white/20"
                placeholder="Enter your username"
                required
              />
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-yellow-400/20 pointer-events-none transition-all duration-300"></div>
            </div>
          </div>
          
          <div>
            <label className="block text-white/80 mb-2 text-sm font-medium">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-lock text-yellow-400/80 group-hover:text-yellow-300 transition-colors duration-200"></i>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400/50 transition-all duration-200 hover:border-white/20"
                placeholder="Enter your password"
                required
              />
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-yellow-400/20 pointer-events-none transition-all duration-300"></div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative overflow-hidden bg-gradient-to-r from-[#7e22ce] to-[#9222ce] text-white py-3 px-4 rounded-xl hover:from-[#7e22ce]/90 hover:to-[#9222ce]/90 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium group"
          >
            <span className="relative z-10 flex items-center justify-center">
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Logging in...
                </>
              ) : (
                <>
                  <span>Login</span>
                  <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-300"></i>
                </>
              )}
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="absolute -inset-px rounded-xl border border-white/10 group-hover:border-yellow-400/30 transition-colors duration-300"></span>
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-white/60">
          <p className="flex items-center justify-center">
            Made with <i className="fas fa-heart text-yellow-400 mx-1.5 pulse-beat"></i> by Riddhima, Anvita & Adriteyo
          </p>
          <p className="mt-1 text-xs text-white/40">© {new Date().getFullYear()} EZTransport - All rights reserved</p>
        </div>
      </div>
    </div>
  );
}