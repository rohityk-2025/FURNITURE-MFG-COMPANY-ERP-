export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      fontSize: { xs:'0.7rem', sm:'0.8rem', base:'0.875rem', lg:'1rem', xl:'1.125rem', '2xl':'1.25rem', '3xl':'1.5rem' },
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',400:'#60a5fa',500:'#2563eb',600:'#1d4ed8',700:'#1e40af' },
        secondary:{ 50:'#f5f3ff',100:'#ede9fe',500:'#7c3aed',600:'#6d28d9' },
        surface: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a' }
      }
    }
  },
  plugins: []
}
