import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  Search, Plus, MapPin, Phone, Calendar, Check, Trash2, 
  MessageSquare, Send, X, Image as ImageIcon, CheckCircle, 
  AlertCircle, HelpCircle, User, Loader2
} from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = '/api';

export default function LostFoundSystem() {
  const { token, user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('lost'); // 'lost' | 'found'
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'lost' | 'found'
  const [filterStatus, setFilterStatus] = useState('open'); // 'all' | 'open' | 'resolved'

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    contact: ''
  });
  const [imageInput, setImageInput] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Comments UI state per item ID
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/lost-found`, config);
      setItems(res.data);
    } catch (err) {
      console.error('Error fetching lost & found items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setImageInput(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) return;

    try {
      setFormLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...formData,
        type: formType,
        image: imageInput || null
      };

      const res = await axios.post(`${API_URL}/lost-found`, payload, config);
      setItems([res.data, ...items]);
      
      // Reset form
      setFormData({ title: '', description: '', location: '', contact: '' });
      setImageInput('');
      setShowForm(false);
    } catch (err) {
      console.error('Error submitting item:', err);
      alert(err.response?.data?.message || 'Error submitting item. It may contain blocked/inappropriate content.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleResolve = async (itemId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.put(`${API_URL}/lost-found/${itemId}/resolve`, {}, config);
      setItems(items.map(item => item._id === itemId ? res.data : item));
    } catch (err) {
      console.error('Error resolving item:', err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/lost-found/${itemId}`, config);
      setItems(items.filter(item => item._id !== itemId));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleCommentSubmit = async (e, itemId) => {
    e.preventDefault();
    const commentText = commentInputs[itemId] || '';
    if (!commentText.trim()) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/lost-found/${itemId}/comment`, { text: commentText }, config);
      setItems(items.map(item => item._id === itemId ? { ...item, comments: res.data } : item));
      setCommentInputs(prev => ({ ...prev, [itemId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
      alert(err.response?.data?.message || 'Error adding comment. It may contain blocked/inappropriate content.');
    }
  };

  const toggleComments = (itemId) => {
    setExpandedComments(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Filter and search logic
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Banner Control Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', background: 'linear-gradient(to right, #ca8a04, #eab308, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', width: 'fit-content' }}>
            Lost & Found Bulletin
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Report lost or found objects inside university residential infrastructure.
          </p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem' }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Close Report Form' : 'Report Item'}
        </button>
      </div>

      {/* Glassmorphic Report Dialog */}
      {showForm && (
        <div className="card animate-up" style={{ padding: '2rem', border: '1px solid rgba(202, 138, 4, 0.25)', boxShadow: '0 8px 32px 0 rgba(202, 138, 4, 0.15)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '700' }}>Submit a Report</h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Toggle Type buttons */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>What type of report is this?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFormType('lost')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)',
                    background: formType === 'lost' ? 'rgba(244, 63, 94, 0.12)' : 'var(--bg-accent)',
                    color: formType === 'lost' ? '#f43f5e' : 'var(--text-secondary)',
                    borderColor: formType === 'lost' ? '#f43f5e' : 'var(--border-subtle)',
                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: formType === 'lost' ? '0 0 12px rgba(244, 63, 94, 0.2)' : 'none'
                  }}
                >
                  🔴 Lost Item
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('found')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)',
                    background: formType === 'found' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-accent)',
                    color: formType === 'found' ? '#10b981' : 'var(--text-secondary)',
                    borderColor: formType === 'found' ? '#10b981' : 'var(--border-subtle)',
                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: formType === 'found' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                >
                  🟢 Found Item
                </button>
              </div>
            </div>

            {/* Title & Location inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>Item Title</label>
                <input 
                  type="text" name="title" className="input-field" 
                  placeholder="e.g. Blue Bose Headphones" value={formData.title} 
                  onChange={handleInputChange} required 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>Location</label>
                <input 
                  type="text" name="location" className="input-field" 
                  placeholder="e.g. GH1 Mess Hall, Second Floor" value={formData.location} 
                  onChange={handleInputChange} required 
                />
              </div>
            </div>

            {/* Description textarea */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>Item Details / Characteristics</label>
              <textarea 
                name="description" className="input-field" 
                placeholder="Give details like color, brand, condition, or special markings. This text is moderated by AI." 
                value={formData.description} onChange={handleInputChange} required 
                style={{ minHeight: '100px', resize: 'none' }} 
              />
            </div>

            {/* Contact & Image attachments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>Contact Info (Optional)</label>
                <input 
                  type="text" name="contact" className="input-field" 
                  placeholder="e.g. Phone/Email/Room no" value={formData.contact} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>Attach Photo (Optional)</label>
                {imageInput ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={imageInput} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <button 
                      type="button" onClick={() => setImageInput('')} 
                      className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }}
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--brand-primary)', padding: '10px 16px', background: 'var(--brand-glow)', borderRadius: '10px', fontWeight: '700', width: 'fit-content', border: '1px solid rgba(202, 138, 4, 0.2)' }}>
                    <ImageIcon size={16} /> Attach Image
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ minWidth: '140px' }}>
                {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Publish Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern Dashboard Filters / Search controls */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Search bar */}
          <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" className="input-field" placeholder="Search lost/found items or locations..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '46px' }}
            />
          </div>

          {/* Filtering buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            
            {/* Filter Type */}
            <div style={{ display: 'flex', background: 'var(--bg-accent)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'all', label: 'All Listings' },
                { id: 'lost', label: 'Lost' },
                { id: 'found', label: 'Found' }
              ].map(t => (
                <button
                  key={t.id} onClick={() => setFilterType(t.id)}
                  style={{
                    border: 'none', background: filterType === t.id ? 'var(--bg-secondary)' : 'transparent',
                    color: filterType === t.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    padding: '6px 14px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filter Status */}
            <div style={{ display: 'flex', background: 'var(--bg-accent)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'all', label: 'All Status' },
                { id: 'open', label: 'Active ⏳' },
                { id: 'resolved', label: 'Resolved ✅' }
              ].map(s => (
                <button
                  key={s.id} onClick={() => setFilterStatus(s.id)}
                  style={{
                    border: 'none', background: filterStatus === s.id ? 'var(--bg-secondary)' : 'transparent',
                    color: filterStatus === s.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    padding: '6px 14px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Grid of Listings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {loading ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--brand-primary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Syncing bulletin entries...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
            <HelpCircle size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.15 }} />
            <p style={{ fontSize: '1.05rem', fontWeight: '600' }}>No matching bulletin entries found.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isOwner = item.user?._id === user?.id || item.user?._id === user?._id || item.user === user?.id || item.user === user?._id;
            const canManage = isOwner || user?.role === 'admin';
            const commentsList = item.comments || [];
            const isCommentsExpanded = expandedComments[item._id] || false;

            return (
              <div 
                key={item._id} className="card animate-up" 
                style={{ 
                  display: 'flex', flexDirection: 'column', justifyItems: 'stretch', justifyContent: 'space-between',
                  opacity: item.status === 'resolved' ? 0.75 : 1,
                  border: item.status === 'resolved' ? '1px dashed var(--border-subtle)' : '1px solid var(--border-subtle)',
                  padding: '1.25rem', position: 'relative', overflow: 'hidden'
                }}
              >
                <div>
                  
                  {/* Top Status & Type Badges Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '0.65rem', padding: '4px 10px', borderRadius: '100px', fontWeight: '800',
                        background: item.type === 'lost' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        color: item.type === 'lost' ? '#f43f5e' : '#10b981',
                        border: `1px solid ${item.type === 'lost' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                      }}>
                        {item.type.toUpperCase()}
                      </span>
                      {item.status === 'resolved' && (
                        <span style={{ 
                          fontSize: '0.65rem', padding: '4px 10px', borderRadius: '100px', fontWeight: '800',
                          background: 'rgba(202, 138, 4, 0.08)', color: '#ca8a04',
                          border: '1px solid rgba(202, 138, 4, 0.2)'
                        }}>
                          RESOLVED ✅
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Attachment image */}
                  {item.image && (
                    <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-subtle)' }}>
                      <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  {/* Title & Description */}
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px', fontWeight: '750' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                    {item.description}
                  </p>

                  {/* Location & Contact coordinates details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-accent)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} style={{ color: 'var(--brand-primary)' }} />
                      <span>📍 {item.location}</span>
                    </div>
                    {item.contact && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <Phone size={14} style={{ color: 'var(--success)' }} />
                        <span>📞 {item.contact}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <User size={14} />
                      <span>Reported by: {item.user?.name || 'Anonymous Resident'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer and interactions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Comments toggle bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <button 
                      onClick={() => toggleComments(item._id)}
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '6px', color: 'var(--text-secondary)' }}
                    >
                      <MessageSquare size={14} /> Comments ({commentsList.length})
                    </button>
                    
                    {/* Management Actions */}
                    {canManage && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleToggleResolve(item._id)}
                          className="btn"
                          style={{
                            padding: '4px 8px', fontSize: '0.725rem', borderRadius: '6px', cursor: 'pointer',
                            background: item.status === 'resolved' ? 'var(--bg-accent)' : 'rgba(202, 138, 4, 0.08)',
                            color: item.status === 'resolved' ? 'var(--text-secondary)' : '#ca8a04',
                            border: '1px solid var(--border-subtle)', fontWeight: '600'
                          }}
                          title={item.status === 'resolved' ? 'Re-open' : 'Mark Resolved'}
                        >
                          {item.status === 'resolved' ? 'Re-open' : 'Resolve'}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="btn"
                          style={{
                            padding: '6px', borderRadius: '6px', cursor: 'pointer',
                            background: 'rgba(244, 63, 94, 0.08)', color: '#f43f5e',
                            border: 'none', display: 'flex', alignItems: 'center'
                          }}
                          title="Delete Listing"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand comments block */}
                  {isCommentsExpanded && (
                    <div className="animate-up" style={{ background: 'var(--bg-accent)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      
                      {/* Comments stream scroll */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                        {commentsList.length === 0 ? (
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', display: 'block', padding: '6px' }}>
                            No remarks yet.
                          </span>
                        ) : (
                          commentsList.map(c => (
                            <div key={c._id} style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px', fontWeight: '600' }}>
                                <span>{c.user?.name || 'Resident'}</span>
                                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{c.text}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add comment form */}
                      <form onSubmit={(e) => handleCommentSubmit(e, item._id)} style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" className="input-field" placeholder="Write comment..."
                          value={commentInputs[item._id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [item._id]: e.target.value }))}
                          style={{ fontSize: '0.75rem', padding: '6px 10px', background: 'var(--bg-secondary)' }}
                        />
                        <button type="submit" disabled={!(commentInputs[item._id] || '').trim()} className="btn btn-primary" style={{ padding: '0 8px', borderRadius: '8px' }}>
                          <Send size={12} />
                        </button>
                      </form>

                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
