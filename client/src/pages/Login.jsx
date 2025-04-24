import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Particles } from "@tsparticles/react";
import { loadFull } from "tsparticles";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Attempting login with:', { username, password });
      const result = await login(username, password);
      
      if (result.success) {
        // Redirect based on user type
        const userType = result.userType;
        console.log('User type:', userType);
        
        // Navigate to the appropriate dashboard based on user type
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 animate-gradient"></div>
      
      {/* Particles Animation */}
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
                value_area: 800
              }
            },
            color: {
              value: ["#fbbf24", "#fde68a", "#ffffff"]
            },
            links: {
              enable: true,
              color: "#fbbf24",
              opacity: 0.3,
              distance: 150,
              width: 1
            },
            move: {
              enable: true,
              speed: 0.5,
              direction: "none",
              random: true,
              straight: false,
              outModes: {
                default: "bounce"
              }
            },
            size: {
              value: { min: 1, max: 3 }
            },
            opacity: {
              value: { min: 0.2, max: 0.5 }
            },
            shape: {
              type: "circle"
            },
            stroke: {
              width: 0,
              color: "#000000"
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
              distance: 10,
              speed: 10
            }
          },
          interactivity: {
            detectsOn: "canvas",
            events: {
              onHover: {
                enable: true,
                mode: "grab"
              },
              onClick: {
                enable: true,
                mode: "push"
              },
              resize: true
            },
            modes: {
              grab: {
                distance: 140,
                links: {
                  opacity: 0.5
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

      {/* Login Card */}
      <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <img 
            src="/logo.svg" 
            alt="EZTransport Logo" 
            className="w-24 h-24 mx-auto mb-4 drop-shadow-lg"
          />
          <h1 className="text-4xl font-bold text-yellow-300 mb-2">EZTransport</h1>
          <p className="text-blue-100 text-lg">Smart Logistics Management</p>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-yellow-300 mb-2 text-sm font-medium">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-user text-yellow-400"></i>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-yellow-500/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all duration-200"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-yellow-300 mb-2 text-sm font-medium">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-lock text-yellow-400"></i>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-yellow-500/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all duration-200"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-indigo-950 py-3 rounded-xl font-medium hover:from-yellow-400 hover:to-amber-500 transition-all duration-300 shadow-lg hover:shadow-xl ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Logging in...' : 'Sign In'}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-blue-100">
              Don't have an account? {' '}
              <a 
                href="/signup" 
                className="text-yellow-300 hover:text-yellow-200 font-medium transition-colors duration-200"
              >
                Sign Up
              </a>
            </p>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-blue-200">
          Made with <i className="fas fa-heart text-yellow-400"></i> by Riddhima, Anvita & Adriteyo
        </div>
      </div>
    </div>
  );
}