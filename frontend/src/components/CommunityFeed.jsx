import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  ThumbsUp, 
  Send, 
  User as UserIcon, 
  Clock, 
  Trash2, 
  Filter, 
  Sparkles, 
  Shield, 
  Image as ImageIcon, 
  Plus, 
  Minus, 
  BarChart2, 
  X 
} from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = '/api';

export default function CommunityFeed() {
  const { token, user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isOfficial, setIsOfficial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'popular'

  // Creation Sub-Tabs & States
  const [activeFeedTab, setActiveFeedTab] = useState('post'); // 'post' | 'poll'
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [imageInput, setImageInput] = useState(''); // Base64 compressed representation

  // Comment UI States per post ID
  const [expandedComments, setExpandedComments] = useState({}); // postId -> boolean
  const [commentInputs, setCommentInputs] = useState({}); // postId -> string
  const [commentAnonymous, setCommentAnonymous] = useState({}); // postId -> boolean

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/posts`);
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Create canvas for compression to keep base64 payloads under 1MB
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

        // Export as compressed jpeg
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setImageInput(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleOptionChange = (index, value) => {
    const opts = [...newPollOptions];
    opts[index] = value;
    setNewPollOptions(opts);
  };

  const addPollOption = () => {
    if (newPollOptions.length >= 4) return;
    setNewPollOptions([...newPollOptions, '']);
  };

  const removePollOption = (index) => {
    if (newPollOptions.length <= 2) return;
    const opts = newPollOptions.filter((_, i) => i !== index);
    setNewPollOptions(opts);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        content: newPost,
        isAnonymous: isOfficial ? false : isAnonymous,
        isPoll: activeFeedTab === 'poll',
        image: activeFeedTab === 'post' ? imageInput : null,
        isOfficial: isOfficial
      };

      if (activeFeedTab === 'poll') {
        payload.pollOptions = newPollOptions.filter(opt => opt.trim() !== '');
        if (payload.pollOptions.length < 2) {
          alert('Please enter at least 2 options for your poll.');
          return;
        }
      }

      const res = await axios.post(`${API_URL}/posts`, payload, config);
      setPosts([res.data, ...posts]);
      setNewPost('');
      setImageInput('');
      setNewPollOptions(['', '']);
      setIsOfficial(false);
    } catch (err) {
      console.error('Error creating post:', err);
      alert(err.response?.data?.message || 'Error creating post');
    }
  };

  const handleLike = async (postId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/posts/${postId}/like`, {}, config);
      setPosts(posts.map(post => post._id === postId ? { ...post, likes: res.data } : post));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleVote = async (postId, optionId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/posts/${postId}/vote`, { optionId }, config);
      setPosts(posts.map(post => post._id === postId ? res.data : post));
    } catch (err) {
      console.error('Error casting vote:', err);
      alert(err.response?.data?.message || 'Error casting vote');
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;
    const isAnon = commentAnonymous[postId] !== undefined ? commentAnonymous[postId] : true;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/posts/${postId}/comment`, { text, isAnonymous: isAnon }, config);
      
      setPosts(posts.map(post => post._id === postId ? { ...post, comments: res.data } : post));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
      alert(err.response?.data?.message || 'Error adding comment');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to moderate and delete this post?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/posts/${postId}`, config);
      setPosts(posts.filter(post => post._id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentInputChange = (postId, val) => {
    setCommentInputs(prev => ({ ...prev, [postId]: val }));
  };

  const handleCommentAnonToggle = (postId, val) => {
    setCommentAnonymous(prev => ({ ...prev, [postId]: val }));
  };

  // Client-side sorting
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'popular') {
      const scoreA = (a.likes?.length || 0) + (a.comments?.length || 0);
      const scoreB = (b.likes?.length || 0) + (b.comments?.length || 0);
      return scoreB - scoreA;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Create Post/Poll Card */}
      <div className="card">
        {/* Creation Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
          <button 
            onClick={() => { setActiveFeedTab('post'); setNewPost(''); }} 
            className="btn btn-ghost"
            style={{
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: '700',
              borderRadius: '8px',
              background: activeFeedTab === 'post' ? 'var(--brand-glow)' : 'transparent',
              color: activeFeedTab === 'post' ? 'var(--brand-primary)' : 'var(--text-secondary)'
            }}
          >
            📝 Write Post
          </button>
          <button 
            onClick={() => { setActiveFeedTab('poll'); setNewPost(''); }} 
            className="btn btn-ghost"
            style={{
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: '700',
              borderRadius: '8px',
              background: activeFeedTab === 'poll' ? 'var(--brand-glow)' : 'transparent',
              color: activeFeedTab === 'poll' ? 'var(--brand-primary)' : 'var(--text-secondary)'
            }}
          >
            📊 Create Poll
          </button>
        </div>

        <form onSubmit={handlePostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeFeedTab === 'post' ? (
            // Write Post Layout
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input-field"
                placeholder="What's on your mind? Posts are moderated by AI..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                style={{ minHeight: '100px', resize: 'none' }}
              />

              {/* Base64 Image Preview & Upload Input */}
              {imageInput ? (
                <div style={{ position: 'relative', width: '100%', maxWeight: '200px', height: '150px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={imageInput} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button" 
                    onClick={() => setImageInput('')}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--brand-primary)', width: 'fit-content', padding: '6px 12px', background: 'var(--brand-glow)', borderRadius: '8px', fontWeight: '600' }}>
                  <ImageIcon size={15} /> Attach Image
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          ) : (
            // Create Poll Layout
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="What is your poll question?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                style={{ fontWeight: '600' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Poll Options</span>
                {newPollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                    />
                    {newPollOptions.length > 2 && (
                      <button 
                        type="button" 
                        onClick={() => removePollOption(idx)}
                        className="btn btn-ghost" 
                        style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }}
                      >
                        <Minus size={15} />
                      </button>
                    )}
                  </div>
                ))}

                {newPollOptions.length < 4 && (
                  <button 
                    type="button" 
                    onClick={addPollOption}
                    className="btn btn-ghost" 
                    style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px' }}
                  >
                    <Plus size={14} /> Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={isOfficial ? false : isAnonymous} 
                  disabled={isOfficial}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                />
                Post anonymously
              </label>
              
              {user?.role === 'admin' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 'bold' }}>
                  <input 
                    type="checkbox" 
                    checked={isOfficial} 
                    onChange={(e) => setIsOfficial(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--danger)', cursor: 'pointer' }}
                  />
                  📢 Make this an Official Notice
                </label>
              )}
            </div>
            <button type="submit" disabled={!newPost.trim()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={16} /> {activeFeedTab === 'poll' ? 'Publish Poll' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>

      {/* Sorting Control Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-accent)', padding: '8px 16px', borderRadius: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} /> Sort Feed By
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
            onClick={() => setSortBy('popular')} 
            className="btn btn-ghost" 
            style={{ 
              padding: '6px 12px', fontSize: '0.8rem', 
              background: sortBy === 'popular' ? 'var(--bg-secondary)' : 'transparent',
              color: sortBy === 'popular' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderRadius: '8px'
            }}
          >
            Popular 🔥
          </button>
        </div>
      </div>

      {/* Feed Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Loading community updates...</div>
        ) : sortedPosts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
             <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
             <p>No community updates yet. Be the first to share!</p>
          </div>
        ) : (
          sortedPosts.map(post => {
            const isMeLiked = post.likes?.includes(user?.id || user?._id);
            const isExpanded = expandedComments[post._id] || false;
            const commentsList = post.comments || [];

            // Poll calculation variables
            const totalVotes = post.isPoll 
              ? post.pollOptions?.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0)
              : 0;

            return (
              <div key={post._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Post Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={18} color="var(--text-secondary)" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {post.isOfficial ? post.user?.name : (post.isAnonymous ? 'Anonymous Resident' : post.user?.name || 'Resident')}
                        {post.isOfficial && <Shield size={12} color="var(--brand-primary)" />}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {post.isPoll && (
                      <span className="badge badge-indigo" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BarChart2 size={12} /> Poll
                      </span>
                    )}
                    {post.isOfficial && <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Official</span>}
                    {user?.role === 'admin' && (
                      <button 
                        onClick={() => handleDeletePost(post._id)}
                        className="btn btn-ghost" 
                        style={{ padding: '6px', color: 'var(--danger)', borderRadius: '8px' }}
                        title="Moderate / Delete Post"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question / Content */}
                <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', fontWeight: '500' }}>{post.content}</p>

                {/* Base64 Image rendering if present */}
                {post.image && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxWeight: '100%', maxHeight: '420px' }}>
                    <img src={post.image} alt="post visual attachment" style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Poll visual options and interaction */}
                {post.isPoll && post.pollOptions && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '8px 0', background: 'var(--bg-accent)', padding: '16px', borderRadius: '12px' }}>
                    {post.pollOptions.map((opt) => {
                      const userVotedThis = opt.votes?.includes(user?.id || user?._id);
                      const voteCount = opt.votes?.length || 0;
                      const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                      return (
                        <button
                          key={opt._id}
                          onClick={() => handleVote(post._id, opt._id)}
                          style={{
                            width: '100%',
                            position: 'relative',
                            padding: '12px 16px',
                            background: 'var(--bg-secondary)',
                            border: userVotedThis ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            textAlign: 'left',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 1,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Vote Percent background bar */}
                          <div 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${percent}%`,
                              background: userVotedThis ? 'var(--brand-glow)' : 'rgba(0,0,0,0.03)',
                              zIndex: -1,
                              transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)'
                            }}
                          />
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {userVotedThis && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-primary)' }} />}
                            {opt.optionText}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {voteCount} votes ({percent}%)
                          </span>
                        </button>
                      );
                    })}
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: '600', alignSelf: 'flex-end', marginRight: '4px' }}>
                      Total Votes: {totalVotes}
                    </span>
                  </div>
                )}

                {/* Post Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button 
                    onClick={() => handleLike(post._id)}
                    className="btn btn-ghost"
                    style={{ 
                      padding: '4px 10px', fontSize: '0.8rem', gap: '6px', 
                      color: isMeLiked ? 'var(--brand-primary)' : 'inherit',
                      background: isMeLiked ? 'var(--brand-glow)' : 'transparent',
                      borderRadius: '8px'
                    }}
                  >
                    <ThumbsUp size={15} /> {post.likes?.length || 0}
                  </button>
                  <button 
                    onClick={() => toggleComments(post._id)}
                    className="btn btn-ghost"
                    style={{ 
                      padding: '4px 10px', fontSize: '0.8rem', gap: '6px', 
                      color: isExpanded ? 'var(--brand-primary)' : 'inherit',
                      background: isExpanded ? 'var(--brand-glow)' : 'transparent',
                      borderRadius: '8px'
                    }}
                  >
                    <MessageSquare size={15} /> {commentsList.length}
                  </button>
                </div>

                {/* Sliding/Expandable Comments Section */}
                {isExpanded && (
                  <div className="animate-up" style={{ padding: '1rem', background: 'var(--bg-accent)', borderRadius: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Comments</h5>
                    
                    {/* Add Comment Input Form */}
                    <form onSubmit={(e) => handleCommentSubmit(e, post._id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Write a comment..."
                          value={commentInputs[post._id] || ''}
                          onChange={(e) => handleCommentInputChange(post._id, e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '6px 12px', background: 'var(--bg-secondary)' }}
                        />
                        <button type="submit" disabled={!(commentInputs[post._id] || '').trim()} className="btn btn-primary" style={{ padding: '0 12px' }}>
                          <Send size={14} />
                        </button>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>
                        <input 
                          type="checkbox" 
                          checked={commentAnonymous[post._id] !== undefined ? commentAnonymous[post._id] : true} 
                          onChange={(e) => handleCommentAnonToggle(post._id, e.target.checked)}
                          style={{ width: '13px', height: '13px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                        />
                        Comment anonymously
                      </label>
                    </form>

                    {/* Comments List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                      {commentsList.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>No comments yet. Start the conversation!</p>
                      ) : (
                        commentsList.map(comment => (
                          <div key={comment._id} style={{ display: 'flex', gap: '10px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <UserIcon size={14} color="var(--text-secondary)" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {comment.user?.role === 'admin' ? comment.user.name : 'Anonymous Resident'}
                                  {comment.user?.role === 'admin' && <Shield size={9} color="var(--brand-primary)" />}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: '1.4', fontWeight: '500' }}>{comment.text}</p>
                            </div>
                          </div>
                        ))
                      )}
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
