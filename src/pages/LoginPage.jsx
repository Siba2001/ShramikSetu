import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, handleLogin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cursor Reactive Glow & Parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // If already logged in, redirect to dashboard or intended page
  const from = location.state?.from?.pathname || '/dashboard';
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  // Mouse move handler for spotlight and subtle architectural parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const offsetX = (e.clientX - centerX) / 45;
      const offsetY = (e.clientY - centerY) / 45;
      setParallaxOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // HTML5 Canvas: Architectural structural grid pulses and glowing nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Grid nodes
    const spacing = 64;
    const cols = Math.ceil(window.innerWidth / spacing) + 1;
    const rows = Math.ceil(window.innerHeight / spacing) + 1;

    // Data pulses traveling along blueprint lines
    const pulses = Array.from({ length: 14 }).map(() => ({
      x: Math.floor(Math.random() * cols) * spacing,
      y: Math.floor(Math.random() * rows) * spacing,
      axis: Math.random() > 0.5 ? 'x' : 'y',
      speed: (Math.random() * 0.8 + 0.4) * (Math.random() > 0.5 ? 1 : -1),
      length: Math.random() * 40 + 20,
      opacity: Math.random() * 0.4 + 0.2
    }));

    let t = 0;
    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle luminous pulses
      pulses.forEach((p) => {
        ctx.beginPath();
        if (p.axis === 'x') {
          p.x += p.speed;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;

          const grad = ctx.createLinearGradient(p.x - p.length, p.y, p.x, p.y);
          grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
          grad.addColorStop(1, `rgba(96, 165, 250, ${p.opacity})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.moveTo(p.x - p.length, p.y);
          ctx.lineTo(p.x, p.y);
        } else {
          p.y += p.speed;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

          const grad = ctx.createLinearGradient(p.x, p.y - p.length, p.x, p.y);
          grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
          grad.addColorStop(1, `rgba(96, 165, 250, ${p.opacity})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.moveTo(p.x, p.y - p.length);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });

      // Subtle reactive node glowing near cursor
      for (let i = 0; i < cols; i += 2) {
        for (let j = 0; j < rows; j += 2) {
          const nx = i * spacing;
          const ny = j * spacing;
          const dist = Math.hypot(nx - mousePos.x, ny - mousePos.y);

          if (dist < 180) {
            const glow = (1 - dist / 180) * 0.45;
            ctx.beginPath();
            ctx.arc(nx, ny, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147, 197, 253, ${glow})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both your Username and Password.');
      return;
    }

    setLoading(true);

    try {
      const res = await handleLogin(username, password, rememberMe);
      setLoading(false);

      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Invalid credentials. Please verify your login details.');
      }
    } catch (err) {
      setLoading(false);
      setError('Authentication failed. Please verify credentials or backend connection.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-hidden font-sans select-none">

      {/* 1. Cursor-Reactive Ambient Spotlight Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(37, 99, 235, 0.13), transparent 75%)`
        }}
      />

      {/* 2. Full-Screen Architectural Blueprint Grid (opacity: 0.04) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FFFFFF 1px, transparent 1px),
            linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* 3. HTML5 Canvas: Structural Data Pulses & Glow Nodes */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* 4. Fine Architectural SVG Linework: Konark Compass & Parabolic Bridge Arches */}
      <div
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0)`
        }}
      >
        <svg
          viewBox="0 0 1200 800"
          className="w-[1400px] h-[950px] opacity-[0.055] stroke-white fill-none"
          strokeWidth="1"
        >
          {/* Konark-Inspired Precision Geometric Compass Ring */}
          <circle cx="600" cy="360" r="320" strokeDasharray="3 6" />
          <circle cx="600" cy="360" r="260" />
          <circle cx="600" cy="360" r="200" strokeDasharray="1 4" />
          <circle cx="600" cy="360" r="140" />
          <circle cx="600" cy="360" r="60" />

          {/* Azimuth Spokes */}
          {Array.from({ length: 24 }).map((_, i) => {
            const rad = (i * 15 * Math.PI) / 180;
            const x1 = 600 + Math.cos(rad) * 60;
            const y1 = 360 + Math.sin(rad) * 60;
            const x2 = 600 + Math.cos(rad) * 320;
            const y2 = 360 + Math.sin(rad) * 320;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.8" />;
          })}

          {/* Parabolic Bridge Arches ("Setu") */}
          <path d="M 50 780 Q 600 380 1150 780" strokeWidth="1.8" />
          <path d="M 120 780 Q 600 440 1080 780" strokeWidth="1.2" strokeDasharray="6 4" />
          <path d="M 200 780 Q 600 500 1000 780" strokeWidth="0.8" />

          {/* Vertical Hangers */}
          {Array.from({ length: 21 }).map((_, idx) => {
            const x = 200 + idx * 40;
            const archY = 780 - 4 * (1 - Math.pow((x - 600) / 400, 2)) * 280;
            return <line key={idx} x1={x} y1={780} x2={x} y2={Math.max(archY, 500)} strokeWidth="0.6" />;
          })}
        </svg>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[420px] relative z-10 space-y-6">

        {/* ======================================================== */}
        {/* BRAND LOGO & HEADER (Centered Above Card)                */}
        {/* ======================================================== */}
        <div className="text-center flex flex-col items-center">

          {/* 3D-layered beveled cobalt blue square icon badge (56px x 56px, rounded-2xl) */}
          <div className="relative group mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 p-0.5 shadow-[0_12px_28px_-6px_rgba(37,99,235,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-white/25 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">

              {/* Metallic Light Shimmer Overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />

              {/* Geometric Vector Mark: Odia temple-arch, hardhat keystone, bridge span */}
              <svg
                viewBox="0 0 40 40"
                className="w-8 h-8 fill-none stroke-white drop-shadow-sm"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Temple Arch Silhouette Peak */}
                <path d="M 20 6 L 26 14 L 14 14 Z" fill="white" />
                <path d="M 14 14 L 14 22 L 26 22 L 26 14" strokeWidth="2" />

                {/* Nirman Hardhat / Keystone Crest */}
                <path d="M 16 20 C 16 16.5 24 16.5 24 20" strokeWidth="2.4" />

                {/* Suspension Bridge Parabolic Arch ("Setu") */}
                <path d="M 7 32 Q 20 22 33 32" strokeWidth="2.4" />
                <line x1="7" y1="32" x2="33" y2="32" strokeWidth="1.8" />

                {/* Bridge Vertical Hangers */}
                <line x1="14" y1="26.5" x2="14" y2="32" strokeWidth="1.5" />
                <line x1="20" y1="24.5" x2="20" y2="32" strokeWidth="1.5" />
                <line x1="26" y1="26.5" x2="26" y2="32" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* Wordmark & Subtitle */}
          <h1 className="text-2xl font-black tracking-tight text-white leading-none">
            Shramik<span className="text-[#3B82F6]">Setu</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-1.5">
            Odisha Nirman Shramik Management System
          </p>
        </div>

        {/* ======================================================== */}
        {/* MINIMALIST CARD SURFACE (Pure White, max-w: 420px)       */}
        {/* ======================================================== */}
        <div className="bg-white rounded-[20px] p-8 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65),0_0_1px_1px_rgba(255,255,255,0.06)] border border-slate-100 text-slate-800">

          {/* Card Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access the portal
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Utility Row: Remember Me Checkbox */}
            <div className="flex items-center pt-1">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#2563EB] border-slate-300 rounded focus:ring-[#2563EB] cursor-pointer"
                />
                <span className="ml-2 text-xs text-slate-600 font-medium">
                  Remember me
                </span>
              </label>
            </div>

            {/* Primary CTA: Cobalt Blue with Smooth Hover Light-Sweep Animation */}
            <button
              type="submit"
              disabled={loading}
              className="relative overflow-hidden w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:opacity-60 transition-all shadow-md shadow-blue-600/25 cursor-pointer after:absolute after:inset-0 after:translate-x-[-100%] hover:after:translate-x-[100%] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:transition-transform after:duration-700"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>

        {/* ======================================================== */}
        {/* FOOTER BELOW CARD                                        */}
        {/* ======================================================== */}
        <p className="text-center text-[11px] text-slate-400 font-medium">
          ShramikSetu • Private Operations Management System
        </p>

      </div>

    </div>
  );
}
