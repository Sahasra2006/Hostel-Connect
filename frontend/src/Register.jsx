import { useState, useContext, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Building, Hash, Shield, ArrowRight, Sun, Moon } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import './index.css';

const HOSTELS = [
  'GH1', 'GH2', 'GH3', 'GH4', 'GH5', 'GH6', 'GH7', 'GH8', 'GH9',
  'BH1', 'BH2', 'BH3', 'BH4', 'BH5', 'BH6', 'BH7', 'BH8', 'BH9'
];

const BLOCKS = ['A', 'B'];

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    password: '',
    role: 'student',
    roomNumber: ''
  });
  const [hostel, setHostel] = useState('GH1');
  const [block, setBlock] = useState('A');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    // Exclude hostelBlock and roomNumber for admin accounts
    const registerPayload = { ...formData };
    if (formData.role === 'admin') {
      delete registerPayload.hostelBlock;
      delete registerPayload.roomNumber;
    } else {
      registerPayload.hostelBlock = `${hostel}-${block}`;
    }

    const result = await register(registerPayload);
    setIsLoading(false);
    if (result.success) navigate('/');
    else setError(result.message);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ position: 'fixed', top: '2rem', right: '2rem' }}>
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="card animate-up" style={{ width: '100%', maxWidth: '520px', padding: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--brand-primary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 1.5rem' }}>
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>HostelConnect</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create your official resident profile</p>
        </div>

        {error && <div className="card" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-accent)', padding: '4px', borderRadius: '12px', marginBottom: '0.5rem' }}>
            <button type="button" onClick={() => { setFormData({ ...formData, role: 'student', registrationNumber: '' }); setHostel('GH1'); setBlock('A'); }} className="btn" style={{ flex: 1, background: formData.role === 'student' ? 'var(--bg-secondary)' : 'transparent', color: formData.role === 'student' ? 'var(--brand-primary)' : 'var(--text-secondary)', boxShadow: formData.role === 'student' ? 'var(--card-shadow)' : 'none' }}>Student</button>
            <button type="button" onClick={() => { setFormData({ ...formData, role: 'admin', registrationNumber: '', roomNumber: '' }); setHostel('GH1'); setBlock('A'); }} className="btn" style={{ flex: 1, background: formData.role === 'admin' ? 'var(--bg-secondary)' : 'transparent', color: formData.role === 'admin' ? 'var(--brand-primary)' : 'var(--text-secondary)', boxShadow: formData.role === 'admin' ? 'var(--card-shadow)' : 'none' }}>Administrator</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
             <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <UserIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input type="text" name="name" className="input-field" placeholder="John Doe" value={formData.name} onChange={handleInputChange} required style={{ paddingLeft: '40px' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>{formData.role === 'admin' ? 'Admin ID' : 'Registration Number'}</label>
              <div style={{ position: 'relative' }}>
                <UserIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input type="text" name="registrationNumber" className="input-field" placeholder={formData.role === 'admin' ? '5 or 8 digits' : '8 digits'} pattern={formData.role === 'admin' ? '(\\d{5}|\\d{8})' : '\\d{8}'} maxLength={8} value={formData.registrationNumber} onChange={handleInputChange} required style={{ paddingLeft: '40px' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Security Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input type="password" name="password" className="input-field" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required style={{ paddingLeft: '40px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Hostel</label>
              <div style={{ position: 'relative' }}>
                <Building style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <select name="hostel" className="input-field" value={hostel} onChange={e => setHostel(e.target.value)} style={{ paddingLeft: '40px', appearance: 'none' }}>
                  {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Block</label>
              <div style={{ position: 'relative' }}>
                <Building style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <select name="block" className="input-field" value={block} onChange={e => setBlock(e.target.value)} style={{ paddingLeft: '40px', appearance: 'none' }}>
                  {BLOCKS.map(b => <option key={b} value={b}>Block {b}</option>)}
                </select>
              </div>
            </div>
          </div>

          {formData.role === 'student' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Room Number</label>
              <div style={{ position: 'relative' }}>
                <Hash style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input type="text" name="roomNumber" className="input-field" placeholder="101" value={formData.roomNumber} onChange={handleInputChange} required style={{ paddingLeft: '40px' }} />
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '1rem' }}>
            {isLoading ? 'Creating account...' : 'Complete Registration'}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: '600', textDecoration: 'none' }}>Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
