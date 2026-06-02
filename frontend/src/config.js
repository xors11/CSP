// Centralized API configuration
// In production (Vercel), VITE_API_URL must be set in the Vercel dashboard
// under: Project Settings > Environment Variables > VITE_API_URL = https://csp-0rbe.onrender.com
// The fallback below is the Render backend so the build never breaks.
export const API_URL = import.meta.env.VITE_API_URL || 'https://csp-0rbe.onrender.com';
