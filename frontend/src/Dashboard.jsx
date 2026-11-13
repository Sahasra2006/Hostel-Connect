import React, { useContext, useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, LogOut, MessageSquare, MessageCircle, AlertCircle, 
  User as UserIcon, Shield, Mail, MapPin, Hash, Utensils, Bell, X, 
  CheckCheck, ChevronRight, Lock, Sun, Moon, Search, Settings, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from './context/AuthContext';
import NotificationContext from './context/NotificationContext';
import CommunityFeed from './components/CommunityFeed';
import ComplaintSystem from './components/ComplaintSystem';
import ChatSystem from './components/ChatSystem';
import MessMenu from './components/MessMenu';
import ConstellationBackground from './components/ConstellationBackground';
import AIChatAssistant from './components/AIChatAssistant';
import LostFoundSystem from './components/LostFoundSystem';
import DevSecOpsDashboard from './components/DevSecOpsDashboard';
import './index.css';

const formatHostelBlock = (hostelBlock) => {
  if (!hostelBlock) return 'Unassigned';
  if (hostelBlock.includes('-')) {
    const [hostel, block] = hostelBlock.split('-');
    return `${hostel} (Block ${block})`;
  }
  return hostelBlock;
};

export default function Dashboard() {
  const { user, logout, updateUser } = useContext(AuthContext);
  const { notifications, unreadCount, markAllRead, clearAll } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();

  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [officialNotices, setOfficialNotices] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [quote, setQuote] = useState('');
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: user?.name || '', roomNumber: user?.roomNumber || '' });
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name || '', roomNumber: user.roomNumber || '' });
    }
  }, [user]);

  const [adminStats, setAdminStats] = useState({
    totalTickets: 0,
    pending: 0,
    inProgress: 0,
    highPriority: 0,
    engagementRate: 98.4
  });

  // Theme Management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const quotes = [
    "Your home away from home. ✨",
    "Making hostel life easier, one click at a time. 🚀",
    "Stay connected, stay ahead. 🌟",
    "Where every resident is a family member. 🏠",
    "Building a smarter community together. 🤝"
  ];

  useEffect(() => {
    if (user) {
      const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setQuote(selectedQuote);
      
      let i = 0;
      setTypedText('');
      const timer = setInterval(() => {
        setTypedText(selectedQuote.substring(0, i));
        i++;
        if (i > selectedQuote.length) clearInterval(timer);
      }, 40);
      return () => clearInterval(timer);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const postsRes = await axios.get('/api/posts', config);
      setTrendingPosts(postsRes.data.slice(0, 3));
      
      // Filter posts that are explicitly marked as Official Notices
      const officialNoticesData = postsRes.data.filter(post => post.isOfficial === true);
      setOfficialNotices(officialNoticesData.slice(0, 5));
      
      if (user?.role === 'admin') {
        const complaintsRes = await axios.get('/api/complaints', config);
        const complaints = complaintsRes.data;
        const pending = complaints.filter(c => c.status === 'Pending').length;
        const inProgress = complaints.filter(c => c.status === 'In Progress').length;
        const highPriority = complaints.filter(c => c.priority === 'High' && c.status !== 'Resolved').length;
        setAdminStats({
          totalTickets: complaints.length,
          pending,
          inProgress,
          highPriority,
          engagementRate: 98.4
        });
      }
      setLoadingDashboard(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoadingDashboard(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/auth/change-password', pwdData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPwdMsg({ text: 'Password updated successfully!', type: 'success' });
      setPwdData({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwdMsg({ text: err.response?.data?.message || 'Failed to update password', type: 'error' });
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('/api/auth/update-profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateUser(res.data.user);
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
      setIsEditingProfile(false);
    } catch (err) {
      setProfileMsg({ text: err.response?.data?.message || 'Failed to update profile', type: 'error' });
    }
  };

  const navItems = user?.role === 'admin' ? [
    { id: 'overview', label: 'Command Control', icon: <LayoutDashboard size={20} /> },
    { id: 'mess', label: 'Mess Logistics', icon: <Utensils size={20} /> },
    { id: 'community', label: 'Official Notices', icon: <MessageSquare size={20} /> },
    { id: 'chat', label: 'Live Resident Stream', icon: <MessageCircle size={20} /> },
    { id: 'complaints', label: 'Operation Tickets', icon: <AlertCircle size={20} /> },
    { id: 'lostfound', label: 'Lost & Found Logs', icon: <HelpCircle size={20} /> },
    { id: 'devsecops', label: 'DevSecOps Center', icon: <Shield size={20} /> },
  ] : [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'mess', label: 'Mess Menu', icon: <Utensils size={20} /> },
    { id: 'community', label: 'Community Feed', icon: <MessageSquare size={20} /> },
    { id: 'chat', label: 'Global Chat', icon: <MessageCircle size={20} /> },
    { id: 'complaints', label: 'Service Requests', icon: <AlertCircle size={20} /> },
    { id: 'lostfound', label: 'Lost & Found', icon: <HelpCircle size={20} /> },
  ];

  const renderDashboard = () => {
    if (user?.role === 'admin') {
      return (
        <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Operations Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Hostel Administration Dashboard
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Operational overview and hostel service request statistics.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>DB connected</span>
              </div>
              <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>Real-time gateway active</span>
              </div>
            </div>
          </div>

          {/* Metric widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--brand-primary)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Active Service Requests</p>
              <h3 style={{ fontSize: '2.25rem', marginTop: '0.5rem', fontWeight: '800' }}>
                {adminStats.pending + adminStats.inProgress}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {adminStats.pending} pending / {adminStats.inProgress} active
              </p>
            </div>

            <div className="card" style={{ borderLeft: `4px solid ${adminStats.highPriority > 0 ? 'var(--danger)' : 'var(--border-subtle)'}` }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Urgent Attention Required</p>
              <h3 style={{ fontSize: '2.25rem', marginTop: '0.5rem', fontWeight: '800', color: adminStats.highPriority > 0 ? 'var(--danger)' : 'inherit' }}>
                {adminStats.highPriority}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {adminStats.highPriority > 0 ? '⚠️ High priority unresolved tickets' : '✅ Operational safety clear'}
              </p>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total Logged Requests</p>
              <h3 style={{ fontSize: '2.25rem', marginTop: '0.5rem', fontWeight: '800' }}>
                {adminStats.totalTickets}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                All student ticket logs to date
              </p>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Community Engagement</p>
              <h3 style={{ fontSize: '2.25rem', marginTop: '0.5rem', fontWeight: '800', color: 'var(--success)' }}>
                {adminStats.engagementRate}%
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Active student feed participation
              </p>
            </div>
          </div>

          {/* Activity stream and services */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Recent Student Feed Activity
              </h3>
              {loadingDashboard ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading feed activity...</div>
              ) : trendingPosts.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>No recent posts found.</div>
              ) : (
                trendingPosts.map(post => (
                  <div key={post._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Resident: {post.user?.name || 'Student'}</span>
                      <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {post.content.substring(0, 120)}...
                    </p>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
                System Services Status
              </h3>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Database Service', status: 'Online', color: 'var(--success)' },
                  { name: 'Real-time WebSocket Gateway', status: 'Online', color: 'var(--success)' },
                  { name: 'Gemini AI Assistant', status: 'Active & Ready', color: 'var(--success)' },
                  { name: 'Security Firewall', status: 'Protected', color: 'var(--brand-primary)' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingBottom: idx === 3 ? 0 : '10px', borderBottom: idx === 3 ? 'none' : '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span style={{ color: item.color, fontWeight: 'bold' }}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Student Dashboard Layout (Discord + Notion style)
    return (
      <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Welcome Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ minHeight: '100px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '4px', background: 'linear-gradient(to right, #ca8a04, #eab308, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Hey, {user?.name.split(' ')[0]}! ✨
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '24px' }}>
              <p style={{ 
                color: 'var(--brand-primary)', 
                fontSize: '1rem', 
                fontWeight: '500',
                borderRight: '2px solid var(--brand-primary)',
                paddingRight: '4px',
                animation: 'blink 0.7s infinite'
              }}>
                {typedText}
              </p>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>Here's what's happening in your community today.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '100px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
              <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>MESS GATEWAY IS OPEN 🍽</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          {/* Trending Updates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem' }}>🔥 Trending in Community</h3>
              <button onClick={() => setActiveTab('community')} className="btn btn-ghost" style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>View Lounge</button>
            </div>
            
            {loadingDashboard ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>Loading updates...</div>
            ) : trendingPosts.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No lounge activities logged yet. Let's make a post!</div>
            ) : (
              trendingPosts.map(post => (
                <div key={post._id} className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #eab308, #ca8a04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1c1917', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      🎭
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{post.user?.role === 'admin' ? post.user.name : 'Anonymous Resident'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{post.content.substring(0, 150)}{post.content.length > 150 ? '...' : ''}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick Info / Events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>📢 Official Noticeboard</h3>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {officialNotices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Bell size={24} style={{ marginBottom: '8px', opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                  No official notices posted yet.
                </div>
              ) : (
                officialNotices.map((notice, i) => {
                  let type = 'Notice';
                  let bg = 'rgba(202, 138, 4, 0.08)';
                  let color = '#ca8a04';
                  let border = '1px solid rgba(202, 138, 4, 0.2)';
                  let icon = <Bell size={18}/>;

                  if (notice.isPoll) {
                    type = 'Poll';
                    bg = 'rgba(99, 102, 241, 0.08)';
                    color = '#6366f1';
                    border = '1px solid rgba(99, 102, 241, 0.2)';
                    icon = <CheckCheck size={18}/>;
                  } else if (notice.content.toLowerCase().match(/(urgent|attention|alert|emergency|important|warning)/)) {
                    type = 'Alert';
                    bg = 'rgba(244, 63, 94, 0.08)';
                    color = '#f43f5e';
                    border = '1px solid rgba(244, 63, 94, 0.2)';
                    icon = <AlertCircle size={18}/>;
                  }

                  const formattedDate = new Date(notice.createdAt).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  return (
                    <div key={notice._id} style={{ display: 'flex', gap: '1rem', paddingBottom: i === officialNotices.length - 1 ? 0 : '1.25rem', borderBottom: i === officialNotices.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                      <div style={{ 
                        padding: '10px', borderRadius: '12px', 
                        background: bg,
                        color: color,
                        height: 'fit-content', 
                        border: border
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '2px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          {notice.content}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{formattedDate}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAccount = () => {
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    return (
      <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Header Profile Section */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2.5rem' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'var(--brand-primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: '800', boxShadow: '0 10px 25px var(--brand-glow)'
          }}>
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '2rem' }}>{user?.name}</h2>
              <span className="badge badge-blue">{user?.role}</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Hash size={16}/> {user?.registrationNumber}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16}/> {user?.role === 'admin' ? formatHostelBlock(user?.hostelBlock) : `${formatHostelBlock(user?.hostelBlock)}, Room ${user?.roomNumber || 'N/A'}`}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Personal Information</h3>
              {!isEditingProfile && (
                <button onClick={() => setIsEditingProfile(true)} className="btn btn-ghost" style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>Edit Profile</button>
              )}
            </div>
            
            {isEditingProfile ? (
              <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Full Name</label>
                  <input 
                    type="text" className="input-field" required
                    value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  />
                </div>
                {user?.role === 'student' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Room Number</label>
                    <input 
                      type="text" className="input-field" required
                      value={profileData.roomNumber} onChange={(e) => setProfileData({...profileData, roomNumber: e.target.value})}
                    />
                  </div>
                )}
                {profileMsg.text && <p style={{ fontSize: '0.85rem', color: profileMsg.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>{profileMsg.text}</p>}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                  <button type="button" onClick={() => { setIsEditingProfile(false); setProfileMsg({text: '', type: ''}); }} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {[
                  { label: 'Full Name', value: user?.name },
                  { label: 'Registration No.', value: user?.registrationNumber },
                  { label: 'Hostel', value: formatHostelBlock(user?.hostelBlock) },
                  ...(user?.role === 'student' ? [{ label: 'Room Number', value: user?.roomNumber || 'Unassigned' }] : [])
                ].map((item, idx) => (
                  <div key={idx}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{item.label.toUpperCase()}</p>
                    <p style={{ fontWeight: '500' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Security Settings</h3>
              {!showPwdForm && <button onClick={() => setShowPwdForm(true)} className="btn btn-ghost" style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>Change Password</button>}
            </div>
            
            {showPwdForm ? (
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Current Password</label>
                  <input 
                    type="password" className="input-field" placeholder="••••••••" 
                    value={pwdData.currentPassword} onChange={(e) => setPwdData({...pwdData, currentPassword: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>New Password</label>
                  <input 
                    type="password" className="input-field" placeholder="••••••••" 
                    value={pwdData.newPassword} onChange={(e) => setPwdData({...pwdData, newPassword: e.target.value})}
                  />
                </div>
                {pwdMsg.text && <p style={{ fontSize: '0.85rem', color: pwdMsg.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>{pwdMsg.text}</p>}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Password</button>
                  <button type="button" onClick={() => { setShowPwdForm(false); setPwdMsg({text: '', type: ''}); }} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-secondary)' }}>
                <Lock size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.9rem' }}>Secure your account by regularly updating your password.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${user?.role === 'admin' ? 'admin-portal' : 'student-portal'}`} style={{ position: 'relative' }}>
      <ConstellationBackground isAdmin={user?.role === 'admin'} />
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--brand-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: '1.25rem', letterSpacing: '-0.05em' }}>HostelConnect</h1>
        </div>

        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn btn-ghost"
              style={{
                justifyContent: 'flex-start', padding: '0.75rem 1rem', borderRadius: '12px',
                background: activeTab === item.id ? 'var(--brand-glow)' : 'transparent',
                color: activeTab === item.id ? 'var(--brand-primary)' : 'var(--text-secondary)'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeTab === item.id && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-primary)' }} />}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', color: 'var(--danger)', gap: '12px' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="theme-toggle" style={{ position: 'relative' }}>
                <Bell size={20} />
                {unreadCount > 0 && <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-secondary)' }} />}
              </button>
              {showNotifications && (
                <div className="card animate-up" style={{ position: 'absolute', top: '120%', right: 0, width: '320px', padding: '0', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700' }}>Notifications</span>
                    <button onClick={clearAll} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.8rem', cursor: 'pointer' }}>Clear all</button>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: n.read ? 'transparent' : 'var(--brand-glow)' }}>
                          <p style={{ fontSize: '0.85rem' }}>{n.message}</p>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="theme-toggle"
                style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <UserIcon size={20} />
              </button>

              {showProfileMenu && (
                <div className="card animate-up" style={{ position: 'absolute', top: '120%', right: 0, width: '220px', padding: '0.5rem', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                    <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.registrationNumber}</p>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('account'); setShowProfileMenu(false); }}
                    className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                  >
                    <LayoutDashboard size={16} /> My Profile
                  </button>
                  <button 
                    onClick={() => { setActiveTab('account'); setShowPwdForm(true); setShowProfileMenu(false); }}
                    className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                  >
                    <Lock size={16} /> Security Settings
                  </button>
                  <div style={{ margin: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }} />
                  <button 
                    onClick={handleLogout}
                    className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 1rem', fontSize: '0.875rem', color: 'var(--danger)' }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              marginBottom: '0.5rem', 
              background: user?.role === 'admin' ? 'none' : 'linear-gradient(to right, #ca8a04, #eab308, #d97706)', 
              WebkitBackgroundClip: user?.role === 'admin' ? 'none' : 'text', 
              WebkitTextFillColor: user?.role === 'admin' ? 'none' : 'transparent', 
              width: 'fit-content' 
            }}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              {activeTab === 'overview' 
                ? (user?.role === 'admin' ? 'Welcome to your hostel administration dashboard.' : 'Welcome to your cozy hostel resident lounge.') 
                : `Manage your ${navItems.find(i => i.id === activeTab)?.label.toLowerCase()}.`}
            </p>
          </div>

          {activeTab === 'overview' && renderDashboard()}
          {activeTab === 'account' && renderAccount()}
          {activeTab === 'mess' && <MessMenu />}
          {activeTab === 'community' && <CommunityFeed />}
          {activeTab === 'chat' && (
            <div className="card" style={{ height: 'calc(100vh - 280px)', padding: '0', overflow: 'hidden' }}>
              <ChatSystem />
            </div>
          )}
          {activeTab === 'complaints' && <ComplaintSystem />}
          {activeTab === 'lostfound' && <LostFoundSystem />}
          {activeTab === 'devsecops' && user?.role === 'admin' && <DevSecOpsDashboard />}
        </main>
      </div>
      {user && <AIChatAssistant />}
    </div>
  );
}
