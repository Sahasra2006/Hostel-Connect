import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Clock, Plus, Filter, Wrench, ShieldAlert, ThumbsUp, MapPin, AlertCircle } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = '/api';

const formatHostelBlock = (hostelBlock) => {
  if (!hostelBlock) return 'Unassigned';
  if (hostelBlock.includes('-')) {
    const [hostel, block] = hostelBlock.split('-');
    return `${hostel} (Block ${block})`;
  }
  return hostelBlock;
};

export default function ComplaintSystem() {
  const { user, token } = useContext(AuthContext);
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'priority' | 'upvotes'

  // Admin remarks inputs per complaint ID
  const [adminRemarkInputs, setAdminRemarkInputs] = useState({}); // complaintId -> string

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Plumbing',
    hostelBlock: user?.hostelBlock || '',
    roomNumber: user?.roomNumber || ''
  });

  const categories = ['Plumbing', 'Electrical', 'Cleaning', 'Wi-Fi', 'Other'];

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/complaints`, config);
      setComplaints(res.data);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/complaints`, formData, config);
      setShowForm(false);
      setFormData({ ...formData, title: '', description: '' });
      fetchComplaints();
    } catch (err) {
      console.error('Error submitting complaint:', err);
    }
  };

  const updateStatus = async (complaintId, status) => {
    const remark = adminRemarkInputs[complaintId] || '';
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/complaints/${complaintId}`, { status, adminRemarks: remark }, config);
      setAdminRemarkInputs(prev => ({ ...prev, [complaintId]: '' }));
      fetchComplaints();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleUpvote = async (complaintId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/complaints/${complaintId}/upvote`, {}, config);
      setComplaints(complaints.map(c => c._id === complaintId ? { ...c, upvotes: res.data } : c));
    } catch (err) {
      console.error('Error upvoting complaint:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fffbeb', text: '#92400e', border: '#fef3c7' };
      case 'In Progress': return { bg: '#eff6ff', text: '#1e40af', border: '#dbeafe' };
      case 'Resolved': return { bg: '#ecfdf5', text: '#065f46', border: '#d1fae5' };
      default: return { bg: 'var(--bg-accent)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' };
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High': return { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'Medium': return { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Low': return { bg: 'rgba(100, 116, 139, 0.08)', text: '#64748b', border: 'rgba(100, 116, 139, 0.3)' };
      default: return { bg: 'var(--bg-accent)', text: 'var(--text-muted)', border: 'var(--border-subtle)' };
    }
  };

  // Client-side sorting for immediate responsive feedback
  const sortedComplaints = [...complaints].sort((a, b) => {
    if (sortBy === 'upvotes') {
      return (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
    }
    if (sortBy === 'priority') {
      const pWeights = { High: 3, Medium: 2, Low: 1 };
      const weightA = pWeights[a.priority] || 0;
      const weightB = pWeights[b.priority] || 0;
      return weightB - weightA;
    }
    // Default: latest
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem' }}>Service Requests</h3>
        {user?.role !== 'admin' && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? <Plus size={18} style={{ transform: 'rotate(45deg)' }} /> : <Plus size={18} />}
            {showForm ? 'Cancel Request' : 'New Service Request'}
          </button>
        )}
      </div>

      {/* New Request Lodge Form */}
      {showForm && (
        <div className="card animate-up">
          <h4 style={{ marginBottom: '1.5rem' }}>Lodge a Complaint</h4>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Issue Title</label>
                <input type="text" name="title" className="input-field" placeholder="Brief summary (e.g. Leak in bathroom)" value={formData.title} onChange={handleInputChange} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Category</label>
                <select name="category" className="input-field" value={formData.category} onChange={handleInputChange}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Details</label>
              <textarea name="description" className="input-field" placeholder="Provide more context (Emergency terms like leak, fire, shock trigger higher priority)..." value={formData.description} onChange={handleInputChange} required style={{ minHeight: '100px', resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
               <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Sorting Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-accent)', padding: '8px 16px', borderRadius: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} /> Sort Tickets
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setSortBy('latest')} 
            className="btn btn-ghost" 
            style={{ 
              padding: '6px 12px', fontSize: '0.8rem', 
              background: sortBy === 'latest' ? 'var(--bg-secondary)' : 'transparent',
              color: sortBy === 'latest' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderRadius: '8px'
            }}
          >
            Latest
          </button>
          <button 
            onClick={() => setSortBy('priority')} 
            className="btn btn-ghost" 
            style={{ 
              padding: '6px 12px', fontSize: '0.8rem', 
              background: sortBy === 'priority' ? 'var(--bg-secondary)' : 'transparent',
              color: sortBy === 'priority' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderRadius: '8px'
            }}
          >
            Highest Priority 🚨
          </button>
          <button 
            onClick={() => setSortBy('upvotes')} 
            className="btn btn-ghost" 
            style={{ 
              padding: '6px 12px', fontSize: '0.8rem', 
              background: sortBy === 'upvotes' ? 'var(--bg-secondary)' : 'transparent',
              color: sortBy === 'upvotes' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderRadius: '8px'
            }}
          >
            Most Upvoted 👍
          </button>
        </div>
      </div>

      {/* Complaint List Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {sortedComplaints.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
              <p>No service requests found.</p>
          </div>
        ) : (
          sortedComplaints.map(complaint => {
            const status = getStatusColor(complaint.status);
            const priority = getPriorityStyle(complaint.priority || 'Low');
            const upvotesCount = complaint.upvotes?.length || 0;
            const hasUpvoted = complaint.upvotes?.includes(user?.id || user?._id);

            return (
              <div key={complaint._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s ease' }}>
                
                {/* Visual Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    
                    {/* Metadata tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '100px', background: 'var(--bg-accent)', color: 'var(--text-secondary)', fontWeight: '700' }}>
                        {complaint.category.toUpperCase()}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem', padding: '3px 8px', borderRadius: '100px', fontWeight: '800',
                        background: priority.bg, color: priority.text, border: `1px solid ${priority.border}`,
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        <AlertCircle size={10} /> {complaint.priority?.toUpperCase()} PRIORITY
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12}/> {formatHostelBlock(complaint.hostelBlock)}, Room {complaint.roomNumber}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{complaint.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{complaint.description}</p>
                    
                    {/* Admin remarks display */}
                    {complaint.adminRemarks && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--bg-accent)', borderLeft: '3px solid var(--brand-primary)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>Admin Remarks:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{complaint.adminRemarks}</span>
                      </div>
                    )}

                    {/* Student view of AI action */}
                    {complaint.aiSuggestedAction && user?.role !== 'admin' && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.2)', borderLeft: '3px solid var(--brand-primary)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          ✨ AI Smart Diagnosis & Action
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{complaint.aiSuggestedAction}</span>
                      </div>
                    )}

                    {/* Admin view of AI action */}
                    {complaint.aiSuggestedAction && user?.role === 'admin' && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.2)', borderLeft: '3px solid var(--warning)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          ⚡ AI Suggested Resolution Plan
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{complaint.aiSuggestedAction}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Badges right block */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0, marginLeft: '1.5rem' }}>
                    
                    {/* Status Badge */}
                    <span style={{ 
                      padding: '6px 12px', borderRadius: '100px', fontSize: '0.725rem', fontWeight: '800',
                      background: status.bg, color: status.text, border: `1px solid ${status.border}`
                    }}>
                      {complaint.status.toUpperCase()}
                    </span>

                    {/* Upvoting Action Button */}
                    <button 
                      onClick={() => handleUpvote(complaint._id)}
                      className="btn btn-ghost"
                      style={{ 
                        padding: '4px 10px', fontSize: '0.8rem', gap: '6px', 
                        color: hasUpvoted ? 'var(--brand-primary)' : 'inherit',
                        background: hasUpvoted ? 'var(--brand-glow)' : 'transparent',
                        borderRadius: '8px', border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <ThumbsUp size={14} /> {upvotesCount}
                    </button>
                  </div>
                </div>

                {/* Admin moderation controls block */}
                {user?.role === 'admin' && complaint.status !== 'Resolved' && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Admin Resolution panel</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        className="input-field"
                        placeholder="Add updates/resolution remarks..."
                        value={adminRemarkInputs[complaint._id] || ''}
                        onChange={(e) => setAdminRemarkInputs(prev => ({ ...prev, [complaint._id]: e.target.value }))}
                        style={{ minHeight: '60px', resize: 'none', fontSize: '0.8rem', padding: '6px 10px', background: 'var(--bg-accent)' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {complaint.status === 'Pending' && (
                          <button 
                            onClick={() => updateStatus(complaint._id, 'In Progress')} 
                            className="btn" 
                            style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe' }}
                          >
                            Mark In Progress
                          </button>
                        )}
                        <button 
                          onClick={() => updateStatus(complaint._id, 'Resolved')} 
                          className="btn" 
                          style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #d1fae5' }}
                        >
                          Resolve Issue
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
