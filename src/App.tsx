import React, { useState } from 'react';

export default function App() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showModal, setShowModal] = useState(true);

  const languages = [
    'English',
    'Français',
    'Español',
    'Deutsch',
    'Português',
    'Italiano',
    'العربية'
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setUser({ email });
      setShowModal(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      {/* Main App Content */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a154b', margin: 0 }}>MingleNest</h1>
        {user ? (
          <button 
            onClick={() => setUser(null)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
          >
            Log Out
          </button>
        ) : (
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 12px', borderRadius: '6px', background: '#4a154b', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Sign In
          </button>
        )}
      </header>

      {user ? (
        <main style={{ padding: '20px', background: '#f5f5f5', borderRadius: '12px' }}>
          <h2>Welcome to MingleNest!</h2>
          <p>Logged in as: <strong>{user.email}</strong></p>
        </main>
      ) : (
        <main style={{ padding: '20px', background: '#f9f9f9', borderRadius: '12px', textAlign: 'center' }}>
          <p>Please sign in to view your feed and stories.</p>
        </main>
      )}

      {/* Auth & Language Modal */}
      {showModal && !user && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Join MingleNest</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}
              >
                ✕
              </button>
            </div>

            {/* Language Selection - Stacked in vertical column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Language</label>
              <span style={{ fontSize: '12px', color: '#666' }}>Choose the language used around MingleNest.</span>
              
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  marginTop: '4px',
                  fontSize: '14px'
                }}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Email & Password Credentials Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Password</label>
                <input 
                  type="password"
                  required
                  placeholder="enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#4a154b',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
