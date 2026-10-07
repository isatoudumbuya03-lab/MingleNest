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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 1. Header Bar */}
      <header className="p-4 bg-white flex justify-between items-center shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-purple-900">MingleNest</h1>
        <div className="flex items-center gap-3">
          {user && (
            <button 
              onClick={() => { setUser(null); setShowModal(true); }}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100"
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      {/* 2. Main App Content / Feed */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full pb-20">
        {/* Stories Section */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg text-slate-800">Little moments</h2>
            <span className="text-xs text-purple-700 font-medium cursor-pointer">See all →</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-purple-400 flex items-center justify-center text-purple-600 font-bold text-xl">
                +
              </div>
              <span className="text-xs text-slate-600">Your story</span>
            </div>
            {['Maya', 'Olivia', 'Leo'].map((name) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full border-2 border-purple-600 p-0.5">
                  <div className="w-full h-full bg-purple-200 rounded-full flex items-center justify-center text-purple-800 font-bold text-sm">
                    {name[0]}
                  </div>
                </div>
                <span className="text-xs text-slate-600">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Feed Posts */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <p className="text-slate-700 text-sm mb-3">
            A little sunshine, good friends, and nowhere else to be. ☀️
          </p>
          <div className="w-full h-48 bg-purple-100 rounded-xl flex items-center justify-center text-purple-800 font-medium">
            Shared Post Media
          </div>
        </div>
      </main>

      {/* 3. Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around items-center z-10">
        <button className="flex flex-col items-center text-purple-900 font-medium text-xs">
          <span>🏠</span> Home
        </button>
        <button className="flex flex-col items-center text-slate-500 font-medium text-xs">
          <span>📖</span> Stories
        </button>
        <button className="flex flex-col items-center text-slate-500 font-medium text-xs">
          <span>👶</span> Kids Stories
        </button>
        <button className="flex flex-col items-center text-slate-500 font-medium text-xs">
          <span>💬</span> Chats
        </button>
        <button className="flex flex-col items-center text-slate-500 font-medium text-xs">
          <span>👤</span> Profile
        </button>
      </nav>

      {/* 4. Login & Language Modal Popup */}
      {showModal && !user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Join MingleNest</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Language Column Selection */}
            <div className="flex flex-col gap-1 border-b pb-4 border-slate-100">
              <label className="text-sm font-semibold text-slate-800">Language</label>
              <p className="text-xs text-slate-500 mb-2">Choose the language used around MingleNest.</p>
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <input 
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-purple-900 text-white rounded-lg font-semibold text-sm hover:bg-purple-950 transition-colors mt-2"
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
