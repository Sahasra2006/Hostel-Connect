import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  ShieldAlert, ShieldCheck, Terminal, Cpu, HardDrive, RefreshCw,
  GitBranch, Play, CheckCircle2, XCircle, AlertTriangle, AlertCircle,
  Network, Server, Activity, Database, Check, Clock, Eye, AlertOctagon, X
} from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = '/api';

export default function DevSecOpsDashboard() {
  const { token } = useContext(AuthContext);
  
  // Pipeline State
  const [pipeline, setPipeline] = useState(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);

  // K8s & Security State
  const [k8s, setK8s] = useState(null);
  const [security, setSecurity] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Error States for individual sections (degraded state handling)
  const [pipelineError, setPipelineError] = useState(null);
  const [k8sError, setK8sError] = useState(null);
  const [securityError, setSecurityError] = useState(null);
  const [metricsError, setMetricsError] = useState(null);

  // Interactive UI logs viewer modal for pod logs
  const [selectedPodLogs, setSelectedPodLogs] = useState(null);

  // Real-time metric graph state
  const [liveHistory, setLiveHistory] = useState([]);

  useEffect(() => {
    fetchDevSecOpsData();
    const interval = setInterval(() => {
      fetchLiveMetricsAndSecurity();
    }, 5000); // Poll metrics/security alerts every 5 seconds for live simulation updates
    return () => clearInterval(interval);
  }, []);

  const fetchDevSecOpsData = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Fetch Pipeline
      try {
        const pipeRes = await axios.get(`${API_URL}/devsecops/pipeline`, config);
        setPipeline(pipeRes.data);
        setPipelineError(null);
      } catch (err) {
        console.error('Error fetching pipeline:', err);
        setPipelineError(err.response?.data?.message || err.message || 'Failed to connect to Jenkins');
      }

      // Fetch K8s
      try {
        const k8sRes = await axios.get(`${API_URL}/devsecops/k8s`, config);
        setK8s(k8sRes.data);
        setK8sError(null);
      } catch (err) {
        console.error('Error fetching k8s:', err);
        setK8sError(err.response?.data?.message || err.message || 'Failed to connect to Kubernetes');
      }

      // Fetch Security
      try {
        const secRes = await axios.get(`${API_URL}/devsecops/security`, config);
        setSecurity(secRes.data);
        setSecurityError(null);
      } catch (err) {
        console.error('Error fetching security:', err);
        setSecurityError(err.response?.data?.message || err.message || 'Failed to read security scan reports');
      }

      // Fetch Metrics
      try {
        const metRes = await axios.get(`${API_URL}/devsecops/metrics`, config);
        setMetrics(metRes.data);
        setLiveHistory(metRes.data.historicalMetrics || []);
        setMetricsError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setMetricsError(err.response?.data?.message || err.message || 'Failed to connect to Prometheus');
      }

    } catch (globalErr) {
      console.error('Global error fetching DevSecOps telemetry:', globalErr);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveMetricsAndSecurity = async () => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    // Poll Metrics
    try {
      const metRes = await axios.get(`${API_URL}/devsecops/metrics`, config);
      setMetrics(metRes.data);
      setMetricsError(null);
      
      // Update historical metrics line graph
      if (metRes.data.historicalMetrics && metRes.data.historicalMetrics.length > 0) {
        setLiveHistory(prev => {
          const next = [...prev, metRes.data.historicalMetrics[metRes.data.historicalMetrics.length - 1]];
          if (next.length > 12) next.shift(); // Keep last 12 data points
          return next;
        });
      }
    } catch (err) {
      console.error('Error polling live metrics:', err);
      setMetricsError(err.response?.data?.message || err.message || 'Failed to connect to Prometheus');
    }

    // Poll Security
    try {
      const secRes = await axios.get(`${API_URL}/devsecops/security`, config);
      setSecurity(secRes.data);
      setSecurityError(null);
    } catch (err) {
      console.error('Error polling security:', err);
      setSecurityError(err.response?.data?.message || err.message || 'Failed to read security scan reports');
    }

    // Poll Pipeline
    try {
      const pipeRes = await axios.get(`${API_URL}/devsecops/pipeline`, config);
      setPipeline(pipeRes.data);
      setPipelineError(null);
    } catch (err) {
      console.error('Error polling pipeline:', err);
      setPipelineError(err.response?.data?.message || err.message || 'Failed to connect to Jenkins');
    }
  };

  const triggerPipeline = async () => {
    try {
      setPipelineLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/devsecops/pipeline/trigger`, {}, config);
      // Wait briefly then pull latest status
      setTimeout(fetchDevSecOpsData, 1000);
      setLogsExpanded(true);
    } catch (err) {
      console.error('Error triggering pipeline:', err);
      alert('Failed to trigger pipeline: ' + (err.response?.data?.message || err.message));
    } finally {
      setPipelineLoading(false);
    }
  };

  // Fetch real log stream for a Kubernetes pod
  const fetchPodLogs = async (podName) => {
    try {
      setSelectedPodLogs({ name: podName, logs: ['Connecting to pod log stream...', 'Please wait...'] });
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/devsecops/pods/${podName}/logs`, config);
      setSelectedPodLogs(res.data);
    } catch (err) {
      console.error('Error fetching pod logs:', err);
      setSelectedPodLogs({
        name: podName,
        logs: [
          `Error: Failed to fetch logs for pod ${podName}`,
          err.response?.data?.message || err.message,
          'Make sure the pod is currently running and the backend has access to Kubernetes.'
        ]
      });
    }
  };

  // Reusable card degraded status renderer
  const renderDegradedState = (title, message) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', textAlign: 'center' }}>
      <AlertCircle color="#ef4444" size={24} className="pulse-indicator" style={{ animation: 'pulse 2s infinite' }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#ef4444' }}>{title}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <RefreshCw className="animate-spin" size={36} color="var(--brand-primary)" />
        <p style={{ color: 'var(--text-secondary)' }}>Gathering DevSecOps telemetry from EKS & Jenkins...</p>
      </div>
    );
  }

  return (
    <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* DevSecOps Top Status Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'linear-gradient(to right, #ca8a04, #eab308, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', width: 'fit-content' }}>
            DevSecOps Control Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Real-time monitoring of manual infrastructure provisioning, container deployments, static analysis, and runtime vulnerabilities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: k8sError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', borderColor: k8sError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)' }}>
            <span className="pulse-indicator" style={{ background: k8sError ? '#ef4444' : '#10b981' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: k8sError ? '#ef4444' : '#10b981' }}>
              AWS EKS: {k8sError ? 'OFFLINE' : (k8s?.status || 'ONLINE')}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: Jenkins Pipeline and Infrastructure Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Jenkins CI/CD Automation Stage Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitBranch size={20} style={{ color: '#ca8a04' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Jenkins CI/CD Deployment Pipeline</h3>
            </div>
            <button
              onClick={triggerPipeline}
              disabled={(pipeline && pipeline.status === 'RUNNING') || pipelineLoading}
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem', padding: '6px 12px', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', color: '#1c1917',
                opacity: (pipeline && pipeline.status === 'RUNNING') ? 0.6 : 1
              }}
            >
              {(pipeline && pipeline.status === 'RUNNING') ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
              <span>Trigger Pipeline</span>
            </button>
          </div>

          {pipelineError || !pipeline ? (
            renderDegradedState('Jenkins Pipeline Integration Degraded', pipelineError || 'Service offline')
          ) : (
            <>
              {/* Pipeline stage flows */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'var(--bg-accent)', padding: '1.25rem', borderRadius: '12px' }}>
                {pipeline.stages.map((stage, idx) => {
                  const isRunning = stage.status === 'RUNNING';
                  const isSuccess = stage.status === 'SUCCESS';
                  const isFailed = stage.status === 'FAILED';
                  const isPending = stage.status === 'PENDING';
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, minWidth: '80px', position: 'relative' }}>
                      <div 
                        style={{ 
                          width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isSuccess ? 'rgba(16, 185, 129, 0.12)' : isFailed ? 'rgba(239, 68, 68, 0.12)' : isRunning ? 'rgba(202, 138, 4, 0.12)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isSuccess ? '#10b981' : isFailed ? '#ef4444' : isRunning ? '#ca8a04' : 'var(--border-subtle)'}`
                        }}
                      >
                        {isSuccess ? <CheckCircle2 size={16} color="#10b981" /> : isFailed ? <XCircle size={16} color="#ef4444" /> : isRunning ? <RefreshCw size={14} className="animate-spin" color="#ca8a04" /> : <Clock size={14} color="var(--text-muted)" />}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: isRunning ? 'var(--brand-primary)' : isPending ? 'var(--text-muted)' : 'var(--text-primary)' }}>{stage.name}</span>
                      {idx < pipeline.stages.length - 1 && (
                        <div style={{ position: 'absolute', top: '14px', right: '-50%', width: '100%', height: '1px', background: 'var(--border-subtle)', zIndex: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live pipeline log output */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  className="btn btn-ghost"
                  style={{ alignSelf: 'flex-start', padding: '4px 8px', fontSize: '0.75rem', gap: '6px', color: 'var(--brand-primary)' }}
                >
                  <Terminal size={14} /> {logsExpanded ? 'Hide Logs Console' : 'Show Logs Console'}
                </button>
                
                {logsExpanded && (
                  <div 
                    style={{
                      background: '#040714', border: '1px solid var(--border-subtle)', borderRadius: '10px',
                      padding: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8',
                      maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
                    }}
                  >
                    {pipeline.logs && pipeline.logs.map((log, lidx) => (
                      <div key={lidx} style={{ color: log.includes('Error') || log.includes('failed') ? '#f43f5e' : log.includes('SUCCESS') ? '#10b981' : '#cbd5e1' }}>
                        &gt; {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Infrastructure Topology Card & Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Resource telemetry counts */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              Manual Infrastructure Provisioning
            </h3>
            {[
              { label: 'EKS Clusters', val: k8sError ? '0 (Offline)' : '1 (Active)' },
              { label: 'VPC subnets', val: '4 (Private / Public)' },
              { label: 'NAT Gateways', val: '0 (Removed)' },
              { label: 'EC2 Node instances', val: k8sError ? '0 (Offline)' : `${k8s?.nodes?.length || 1} (T3.small)` }
            ].map((resItem, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{resItem.label}</span>
                <span style={{ fontWeight: '700', color: 'var(--brand-primary)' }}>{resItem.val}</span>
              </div>
            ))}
          </div>

          {/* Uptime and response timing */}
          {metricsError || !metrics ? (
            renderDegradedState('Uptime Monitoring Offline', metricsError || 'Prometheus down')
          ) : (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Uptime monitoring</p>
                <h4 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '4px', color: 'var(--success)' }}>{metrics.uptime}</h4>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Avg latency</p>
                <h4 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '4px' }}>{metrics.responseTime}</h4>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Row 2: Topology Network Map */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={20} style={{ color: '#06b6d4' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>EKS Network Topology Map</h3>
        </div>
        
        {k8sError || !k8s ? (
          renderDegradedState('Kubernetes API Connection Degraded', k8sError || 'Cluster unreachable')
        ) : (
          <div style={{ background: '#070a13', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '180px' }}>
            {(() => {
              const podsList = k8s.pods || [];
              const frontendPods = podsList.filter(p => p.name.includes('frontend'));
              const backendPods = podsList.filter(p => p.name.includes('backend'));
              
              const maxPodsCount = Math.max(frontendPods.length, backendPods.length, 2);
              const svgHeight = Math.max(160, maxPodsCount * 60 + 20);
              const centerY = svgHeight / 2;

              return (
                <svg width="100%" height={svgHeight} viewBox={`0 0 600 ${svgHeight}`} style={{ transition: 'height 0.3s' }}>
                  {/* Connection lines: Client to Ingress */}
                  <line x1="60" y1={centerY} x2="140" y2={centerY} stroke="#ca8a04" strokeWidth="2" strokeDasharray="5,5" />

                  {/* Connection lines: Ingress to Frontend Pods */}
                  {frontendPods.map((pod, idx) => {
                    const y_fe = (svgHeight / (frontendPods.length + 1)) * (idx + 1);
                    const isRunning = pod.status === 'Running';
                    return (
                      <line key={`line-in-fe-${idx}`} x1="200" y1={centerY} x2="270" y2={y_fe} stroke={isRunning ? '#10b981' : '#ef4444'} strokeWidth="1.5" />
                    );
                  })}

                  {/* Connection lines: Frontend Pods to Backend Pods */}
                  {frontendPods.map((fPod, fIdx) => {
                    const y_fe = (svgHeight / (frontendPods.length + 1)) * (fIdx + 1);
                    const fRunning = fPod.status === 'Running';
                    return backendPods.map((bPod, bIdx) => {
                      const y_be = (svgHeight / (backendPods.length + 1)) * (bIdx + 1);
                      const bRunning = bPod.status === 'Running';
                      return (
                        <line key={`line-fe-be-${fIdx}-${bIdx}`} x1="340" y1={y_fe} x2="410" y2={y_be} stroke={(fRunning && bRunning) ? '#10b981' : '#ef4444'} strokeWidth="1.5" />
                      );
                    });
                  })}

                  {/* Connection lines: Backend Pods to Mongo Database */}
                  {backendPods.map((pod, idx) => {
                    const y_be = (svgHeight / (backendPods.length + 1)) * (idx + 1);
                    const isRunning = pod.status === 'Running';
                    return (
                      <line key={`line-be-db-${idx}`} x1="480" y1={y_be} x2="540" y2={centerY} stroke={isRunning ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeDasharray="3,3" />
                    );
                  })}

                  {/* Node: Client */}
                  <circle cx="60" cy={centerY} r="18" fill="rgba(202, 138, 4, 0.15)" stroke="#ca8a04" strokeWidth="2" />
                  <text x="60" y={centerY + 3} fill="#fff" fontSize="9" textAnchor="middle">Client</text>

                  {/* Node: Ingress */}
                  <rect x="140" y={centerY - 20} width="60" height="40" rx="8" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="2" />
                  <text x="170" y={centerY + 3} fill="#06b6d4" fontSize="9" textAnchor="middle" fontWeight="bold">Ingress</text>

                  {/* Nodes: Frontend Pods */}
                  {frontendPods.map((pod, idx) => {
                    const y_fe = (svgHeight / (frontendPods.length + 1)) * (idx + 1);
                    const isRunning = pod.status === 'Running';
                    const strokeColor = isRunning ? '#10b981' : '#ef4444';
                    const fillColor = isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    
                    const displayName = pod.name.length > 12 ? pod.name.substring(0, 10) + '..' : pod.name;

                    return (
                      <g key={`node-fe-${idx}`}>
                        <rect x="270" y={y_fe - 18} width="70" height="36" rx="6" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
                        <text x="305" y={y_fe + 1} fill="#fff" fontSize="8" textAnchor="middle">{displayName}</text>
                        <text x="305" y={y_fe + 11} fill={strokeColor} fontSize="7" textAnchor="middle" fontWeight="bold">{pod.status}</text>
                      </g>
                    );
                  })}

                  {/* Nodes: Backend Pods */}
                  {backendPods.map((pod, idx) => {
                    const y_be = (svgHeight / (backendPods.length + 1)) * (idx + 1);
                    const isRunning = pod.status === 'Running';
                    const strokeColor = isRunning ? '#10b981' : '#ef4444';
                    const fillColor = isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    
                    const displayName = pod.name.length > 12 ? pod.name.substring(0, 10) + '..' : pod.name;

                    return (
                      <g key={`node-be-${idx}`}>
                        <rect x="410" y={y_be - 18} width="70" height="36" rx="6" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
                        <text x="445" y={y_be + 1} fill="#fff" fontSize="8" textAnchor="middle">{displayName}</text>
                        <text x="445" y={y_be + 11} fill={strokeColor} fontSize="7" textAnchor="middle" fontWeight="bold">{pod.status}</text>
                      </g>
                    );
                  })}

                  {/* Node: Database Mongo Atlas */}
                  <circle cx="540" cy={centerY} r="22" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="2" />
                  <text x="540" y={centerY + 3} fill="#10b981" fontSize="8" textAnchor="middle" fontWeight="bold">Atlas DB</text>

                  {/* Empty State message if no pods */}
                  {podsList.length === 0 && (
                    <text x="300" y={centerY} fill="var(--text-muted)" fontSize="11" textAnchor="middle">
                      No active pods running. Deploy using Jenkins.
                    </text>
                  )}
                </svg>
              );
            })()}
          </div>
        )}
      </div>

      {/* Row 3: Prometheus Live Metrics & Pod Statuses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Prometheus Metrics Graph */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Prometheus Live CPU/Mem Metrics</h3>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scraped every 5s</span>
          </div>

          {metricsError || !metrics ? (
            renderDegradedState('Prometheus Scraping Degraded', metricsError || 'Server offline')
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* CPU utilization graph visualization */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>EKS Cluster CPU Load</span>
                  <span style={{ fontWeight: '700', color: 'var(--brand-primary)' }}>{liveHistory[liveHistory.length - 1]?.cpuUsage || 0}%</span>
                </div>
                <div style={{ height: '50px', display: 'flex', alignItems: 'flex-end', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {liveHistory.map((pt, pidx) => (
                    <div 
                      key={pidx} 
                      style={{ 
                        flex: 1, background: 'linear-gradient(to top, #ca8a04, #eab308)', 
                        height: `${pt.cpuUsage}%`, borderRadius: '2px', transition: 'height 0.3s ease' 
                      }}
                      title={`Time: ${pt.timestamp} Load: ${pt.cpuUsage}%`}
                    />
                  ))}
                </div>
              </div>

              {/* Request rates graph visualization */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>HTTP request throughput</span>
                  <span style={{ fontWeight: '700', color: '#10b981' }}>{liveHistory[liveHistory.length - 1]?.reqRate || 0} reqs/sec</span>
                </div>
                <div style={{ height: '50px', display: 'flex', alignItems: 'flex-end', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {liveHistory.map((pt, pidx) => (
                    <div 
                      key={pidx} 
                      style={{ 
                        flex: 1, background: 'linear-gradient(to top, #10b981, #34d399)', 
                        height: `${(pt.reqRate / 300) * 100}%`, borderRadius: '2px', transition: 'height 0.3s ease' 
                      }}
                      title={`Throughput: ${pt.reqRate} reqs/s`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kubernetes Pod Monitoring List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Active Pod Registry</h3>
          </div>

          {k8sError || !k8s ? (
            renderDegradedState('Pods Registry Offline', k8sError || 'Cluster unreachable')
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '200px' }}>
              {k8s.pods && k8s.pods.map((pod, pidx) => {
                const isRunning = pod.status === 'Running';
                return (
                  <div key={pidx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-accent)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#10b981' : '#ef4444' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{pod.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>IP: {pod.ip}</span>
                        <span>Restarts: {pod.restarts}</span>
                        <span>CPU/Mem: {pod.cpu} / {pod.memory}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => fetchPodLogs(pod.name)}
                      className="btn btn-ghost" style={{ padding: '6px', borderRadius: '8px' }}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                );
              })}
              {(!k8s.pods || k8s.pods.length === 0) && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  No pods found in namespace.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Vulnerability Scanners (Trivy, GitLeaks) */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} style={{ color: '#ca8a04' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>DevSecOps Vulnerability Scans</h3>
        </div>

        {securityError || !security ? (
          renderDegradedState('Vulnerability Reports Unavailable', securityError || 'Scan reports not found')
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Trivy Card */}
            <div style={{ background: 'var(--bg-accent)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TRIVY IMAGE SCAN</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{(security.trivy?.high || 0) + (security.trivy?.critical || 0)}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: '700' }}>HIGH SEVERITY</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--danger)' }}>Critical: {security.trivy?.critical || 0}</span>
                <span style={{ color: 'var(--warning)' }}>High: {security.trivy?.high || 0}</span>
                <span style={{ color: 'var(--text-muted)' }}>Med: {security.trivy?.medium || 0}</span>
              </div>
            </div>

            {/* GitLeaks Card */}
            <div style={{ 
              background: security.gitleaks?.status === 'VULNERABLE' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', 
              padding: '1rem', 
              borderRadius: '12px', 
              border: security.gitleaks?.status === 'VULNERABLE' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px' 
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>GITLEAKS SECRETS SCAN</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color={security.gitleaks?.status === 'VULNERABLE' ? '#ef4444' : '#10b981'} />
                <span style={{ fontSize: '1rem', fontWeight: '800', color: security.gitleaks?.status === 'VULNERABLE' ? '#ef4444' : '#10b981' }}>
                  {security.gitleaks?.status || 'UNKNOWN'}
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {security.gitleaks?.scannedFilesCount || 0} files scanned · {security.gitleaks?.secretsFound || 0} secrets found
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Pod Logs Viewer */}
      {selectedPodLogs && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%', padding: '1.5rem', border: '1px solid var(--brand-primary)', boxShadow: '0 0 20px var(--brand-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>Logs: {selectedPodLogs.name}</h4>
              <button 
                onClick={() => setSelectedPodLogs(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div 
              style={{ 
                background: '#040714', borderRadius: '8px', padding: '12px', 
                fontFamily: 'monospace', fontSize: '0.725rem', color: '#22c55e',
                maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px'
              }}
            >
              {selectedPodLogs.logs && selectedPodLogs.logs.map((log, lidx) => (
                <div key={lidx}>&gt; {log}</div>
              ))}
              {(!selectedPodLogs.logs || selectedPodLogs.logs.length === 0) && (
                <div>&gt; No log entries found.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
