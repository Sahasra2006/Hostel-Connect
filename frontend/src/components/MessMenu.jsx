import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Coffee, Edit2, Save, X, Utensils, Pizza, Sun, Moon, Star, Calendar, Clock } from 'lucide-react';

const API_URL = '/api';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function MessMenu() {
  const { user } = useContext(AuthContext);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const todayObj = new Date();
  const todayIndex = todayObj.getDay() === 0 ? 6 : todayObj.getDay() - 1;
  const todayName = DAYS[todayIndex];
  const tz = todayObj.getTimezoneOffset();
  const todayDateStr = new Date(todayObj.getTime() - (tz*60*1000)).toISOString().split('T')[0];

  const [activeDay, setActiveDay] = useState(todayName);
  const [viewMode, setViewMode] = useState('today'); 
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [feedbackStats, setFeedbackStats] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [ratingLoading, setRatingLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeMealReview, setActiveMealReview] = useState({ mealKey: null, rating: 0 });

  // Admin-only feedback states
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [allFeedbackAggregates, setAllFeedbackAggregates] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' && viewMode === 'ratings') {
      fetchAllFeedbacks();
      fetchAISummary();
    }
  }, [viewMode, user]);

  const fetchAISummary = async () => {
    try {
      setAiLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/mess-menu/ai-summary`, config);
      setAiSummary(res.data);
    } catch (error) {
      console.error('Error fetching AI mess summary:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchAllFeedbacks = async () => {
    try {
      setFeedbackLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/mess-menu/all-feedback`, config);
      setAllFeedbacks(res.data.feedbacks || []);
      setAllFeedbackAggregates(res.data.aggregates || {});
    } catch (error) {
      console.error('Error fetching all feedback:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchFeedback();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${API_URL}/mess-menu`, config);
      setMenu(res.data);
      setEditForm(res.data);
    } catch (error) {
      console.error('Error fetching mess menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/mess-menu/feedback/${todayDateStr}`, config);
      setFeedbackStats(res.data.stats || {});
      setUserRatings(res.data.userRatings || {});
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const submitRating = async (mealType, rating, comment = commentText) => {
    try {
      setRatingLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/mess-menu/feedback`, { date: todayDateStr, mealType, rating, comment }, config);
      await fetchFeedback();
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/mess-menu`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      setMenu(editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating mess menu:', error);
    }
  };

  const handleChange = (day, meal, value) => {
    setEditForm(prev => ({ ...prev, [day]: { ...prev[day], [meal]: value } }));
  };

  const handleSpecialToggle = (day, mealKey) => {
    setEditForm(prev => {
      const dayObj = prev[day] || {};
      const specialMeals = dayObj.specialMeals ? [...dayObj.specialMeals] : [];
      let updatedSpecials;
      if (specialMeals.includes(mealKey)) {
        updatedSpecials = specialMeals.filter(m => m !== mealKey);
      } else {
        updatedSpecials = [...specialMeals, mealKey];
      }
      return {
        ...prev,
        [day]: {
          ...dayObj,
          specialMeals: updatedSpecials
        }
      };
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading schedule...</div>;
  }

  const getMealCards = (day) => {
    const isWeekend = day === 'saturday' || day === 'sunday';
    return [
      { key: 'breakfast', label: 'Breakfast', icon: <Coffee size={20} />, color: '#f59e0b', time: isWeekend ? '08:00 - 10:00' : '07:30 - 09:30' },
      { key: 'lunch', label: 'Lunch', icon: <Sun size={20} />, color: '#ca8a04', time: '11:30 - 14:30' },
      { key: 'snacks', label: 'Evening Snacks', icon: <Pizza size={20} />, color: '#ec4899', time: '17:00 - 18:00' },
      { key: 'dinner', label: 'Dinner', icon: <Moon size={20} />, color: '#8b5cf6', time: '19:30 - 21:30' }
    ];
  };

  const renderMeal = (meal, day, isToday) => {
    const dayData = (isEditing ? editForm : menu)?.[day] || {};
    const isSpecial = dayData.specialMeals?.includes(meal.key) || false;
    const stats = feedbackStats[meal.key] || { average: 0, count: 0 };
    const myRating = userRatings[meal.key]?.rating || 0;

    return (
      <div 
        key={meal.key} 
        className="card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem', 
          borderTop: `4px solid ${isSpecial ? 'var(--warning)' : meal.color}`,
          border: isSpecial && !isEditing ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
          boxShadow: isSpecial && !isEditing ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'var(--card-shadow)',
          background: isSpecial && !isEditing ? 'linear-gradient(to bottom, rgba(245, 158, 11, 0.05), var(--bg-secondary))' : 'var(--bg-secondary)',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ color: isSpecial ? 'var(--warning)' : meal.color }}>{meal.icon}</div>
            <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {meal.label}
              {isSpecial && !isEditing && (
                <span style={{ fontSize: '0.65rem', background: 'var(--warning)', color: '#fff', padding: '2px 8px', borderRadius: '100px', fontWeight: '800', letterSpacing: '0.05em' }}>
                  SPECIAL ✨
                </span>
              )}
            </h4>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {meal.time}
          </div>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              className="input-field" style={{ minHeight: '80px', resize: 'none' }}
              value={dayData[meal.key] || ''}
              onChange={(e) => handleChange(day, meal.key, e.target.value)}
              placeholder={`Enter ${meal.label} items...`}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={isSpecial}
                onChange={() => handleSpecialToggle(day, meal.key)}
                style={{ width: '15px', height: '15px', accentColor: 'var(--warning)', cursor: 'pointer' }}
              />
              Mark as Chef's Special ✨
            </label>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {dayData[meal.key] || 'No items listed for this session.'}
            </p>
          </div>
        )}

        {isToday && !isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star 
                      key={s} size={18} cursor="pointer"
                      fill={(activeMealReview.mealKey === meal.key ? activeMealReview.rating : myRating) >= s ? (isSpecial ? 'var(--warning)' : meal.color) : 'none'}
                      color={(activeMealReview.mealKey === meal.key ? activeMealReview.rating : myRating) >= s ? (isSpecial ? 'var(--warning)' : meal.color) : 'var(--text-muted)'}
                      onClick={() => {
                        if (user?.role !== 'admin') {
                          setActiveMealReview({ mealKey: meal.key, rating: s });
                          setCommentText(userRatings[meal.key]?.comment || '');
                        }
                      }}
                      style={{ transition: 'all 0.1s ease' }}
                    />
                  ))}
                </div>
                {user?.role !== 'admin' && (
                  <button
                    onClick={() => {
                      setActiveMealReview({ mealKey: meal.key, rating: myRating || 5 });
                      setCommentText(userRatings[meal.key]?.comment || '');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px 6px',
                      fontSize: '0.75rem',
                      color: 'var(--brand-primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '600'
                    }}
                  >
                    💬 {userRatings[meal.key]?.comment ? 'Edit Comment' : 'Add Comment'}
                  </button>
                )}
              </div>
              {stats.count > 0 && <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{stats.average} ({stats.count} ratings)</span>}
            </div>

            {/* Written Comment Area (Students Only) */}
            {activeMealReview.mealKey === meal.key && (
              <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-accent)', padding: '10px', borderRadius: '8px' }}>
                <textarea
                  className="input-field"
                  placeholder="Provide comments or feedback about this meal (optional)..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{ minHeight: '60px', resize: 'none', fontSize: '0.8rem', background: 'var(--bg-secondary)' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      submitRating(meal.key, activeMealReview.rating, commentText);
                      setActiveMealReview({ mealKey: null, rating: 0 });
                      setCommentText('');
                    }}
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '0.75rem', flex: 1 }}
                  >
                    Submit Review
                  </button>
                  <button
                    onClick={() => {
                      setActiveMealReview({ mealKey: null, rating: 0 });
                      setCommentText('');
                    }}
                    className="btn btn-ghost"
                    style={{ padding: '4px 12px', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRatingsDashboard = () => {
    if (feedbackLoading) {
      return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading ratings dashboard...</div>;
    }

    const mealDetails = {
      breakfast: { label: 'Breakfast', icon: <Coffee size={24} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
      lunch: { label: 'Lunch', icon: <Sun size={24} />, color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.08)' },
      snacks: { label: 'Evening Snacks', icon: <Pizza size={24} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)' },
      dinner: { label: 'Dinner', icon: <Moon size={24} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' }
    };

    return (
      <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Aggregate section */}
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Meal Rating Aggregates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {Object.keys(mealDetails).map(mealKey => {
              const detail = mealDetails[mealKey];
              const aggregate = allFeedbackAggregates[mealKey] || { average: 0, count: 0 };
              return (
                <div key={mealKey} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: `5px solid ${detail.color}`, background: 'var(--bg-secondary)' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: detail.bg, color: detail.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {detail.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{detail.label}</h4>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: '800' }}>{aggregate.average || '0.0'}</span>
                      <span style={{ color: detail.color, display: 'flex', alignItems: 'center' }}><Star size={16} fill={detail.color} color={detail.color}/></span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{aggregate.count} ratings</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Sentiment Summary Panel */}
        <div className="card animate-up" style={{ 
          background: 'linear-gradient(135deg, rgba(202, 138, 4, 0.05) 0%, rgba(234, 179, 8, 0.05) 100%)',
          border: '1px solid rgba(202, 138, 4, 0.2)',
          boxShadow: 'var(--card-shadow)',
          padding: '1.5rem',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>✨</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '750', background: 'linear-gradient(90deg, #ca8a04, #eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                AI Meal Quality & Sentiment Analytics
              </h3>
            </div>
            <button 
              onClick={fetchAISummary}
              disabled={aiLoading}
              className="btn btn-ghost"
              style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', border: '1px solid rgba(202, 138, 4, 0.3)', padding: '6px 12px', background: 'rgba(202, 138, 4, 0.05)' }}
            >
              {aiLoading ? 'Analyzing Feedbacks...' : aiSummary ? '🔄 Refresh AI Analysis' : '✨ Generate AI Summary'}
            </button>
          </div>

          {aiLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div className="loading-spinner" style={{ border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--brand-primary)', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>Gemini is auditing student reviews...</span>
            </div>
          ) : aiSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid var(--brand-primary)' }}>
                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Overall Sentiment</span>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', margin: 0 }}>{aiSummary.sentiment}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', margin: '0 0 10px 0', fontWeight: '700' }}>👍 Positive Highlights</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {aiSummary.highlights?.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', margin: '0 0 10px 0', fontWeight: '700' }}>👎 Common Complaints</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {aiSummary.complaints?.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', margin: '0 0 10px 0', fontWeight: '700' }}>💡 Actionable AI Recommendations</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {aiSummary.recommendations?.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Generate an instant, comprehensive analysis of student meal feedback comments and current schedule.
            </p>
          )}
        </div>

        {/* Individual Comments/Ratings */}
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Individual Student Feedback</h3>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {allFeedbacks.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No feedback submitted yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-accent)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      <th style={{ padding: '1rem' }}>Student</th>
                      <th style={{ padding: '1rem' }}>Date</th>
                      <th style={{ padding: '1rem' }}>Meal</th>
                      <th style={{ padding: '1rem' }}>Rating</th>
                      <th style={{ padding: '1rem' }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFeedbacks.map(fb => {
                      const detail = mealDetails[fb.mealType] || { color: 'var(--brand-primary)' };
                      return (
                        <tr key={fb._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '600' }}>{fb.user?.name || 'Unknown Student'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fb.user?.registrationNumber || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{fb.date}</td>
                          <td style={{ padding: '1rem', textTransform: 'capitalize', fontWeight: '500' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: detail.color }}>
                              {fb.mealType}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star 
                                  key={s} size={14}
                                  fill={fb.rating >= s ? detail.color : 'none'}
                                  color={fb.rating >= s ? detail.color : 'var(--text-muted)'}
                                />
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', color: fb.comment ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: fb.comment ? 'normal' : 'italic' }}>
                            {fb.comment || 'No comment provided'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-accent)', padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => { setViewMode('today'); setIsEditing(false); }} className="btn" style={{ background: viewMode === 'today' ? 'var(--bg-secondary)' : 'transparent', color: viewMode === 'today' ? 'var(--brand-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'today' ? 'var(--card-shadow)' : 'none' }}>Today</button>
          <button onClick={() => { setViewMode('week'); setIsEditing(false); }} className="btn" style={{ background: viewMode === 'week' ? 'var(--bg-secondary)' : 'transparent', color: viewMode === 'week' ? 'var(--brand-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'week' ? 'var(--card-shadow)' : 'none' }}>Full Week</button>
          {user?.role === 'admin' && (
            <button onClick={() => { setViewMode('ratings'); setIsEditing(false); }} className="btn" style={{ background: viewMode === 'ratings' ? 'var(--bg-secondary)' : 'transparent', color: viewMode === 'ratings' ? 'var(--brand-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'ratings' ? 'var(--card-shadow)' : 'none' }}>Food Ratings</button>
          )}
        </div>

        {user?.role === 'admin' && viewMode !== 'ratings' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {isEditing ? (
              <button onClick={handleSave} className="btn btn-primary"><Save size={18}/> Publish Menu</button>
            ) : (
              <button onClick={() => { setViewMode('week'); setIsEditing(true); }} className="btn btn-ghost"><Edit2 size={18}/> Manage Menu</button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'ratings' ? (
        renderRatingsDashboard()
      ) : (
        <>
          {viewMode === 'week' && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {DAYS.map(day => (
                <button
                  key={day} onClick={() => setActiveDay(day)}
                  className="btn btn-ghost"
                  style={{
                    textTransform: 'capitalize', whiteSpace: 'nowrap',
                    background: activeDay === day ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                    color: activeDay === day ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {getMealCards(viewMode === 'today' ? todayName : activeDay).map(meal => renderMeal(meal, viewMode === 'today' ? todayName : activeDay, viewMode === 'today'))}
          </div>
        </>
      )}
    </div>
  );
}
