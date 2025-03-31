import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Particles from "react-particles";
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

  const particlesInit = useCallback(async engine => {
    await loadFull(engine);
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
              value: 80,
              density: {
                enable: true,
                value_area: 800
              }
            },
            color: {
              value: "#ffffff"
            },
            links: {
              enable: true,
              color: "#ffffff",
              opacity: 0.2,
              distance: 150,
              width: 1
            },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              random: false,
              straight: false,
              outModes: {
                default: "bounce"
              }
            },
            size: {
              value: 2
            },
            opacity: {
              value: 0.3
            }
          }
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
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-950 py-3 px-4 rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-blue-200">
          Made with <i className="fas fa-heart text-yellow-400"></i> by Riddhima, Anvita & Adriteyo
        </div>
      </div>
    </div>
  );
}