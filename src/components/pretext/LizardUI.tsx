import React from 'react';

export const LizardHeader: React.FC<{ layoutTime: number, fps: number }> = ({ layoutTime, fps }) => (
  <div className="pretext-header" style={{ 
    background: 'var(--bg-layout)', 
    borderBottom: '1px solid var(--border-color)', 
    padding: '15px 25px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    zIndex: 10 
  }}>
    <div className="pretext-title">
      <h1 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>视频驱动动态排版</h1>
      <p style={{ color: 'var(--text-subtle)', margin: 0, fontSize: '11px' }}>Retina 级别高清渲染 + Pretext 多槽位避障系统</p>
    </div>
    <div className="pretext-stats" style={{ display: 'flex', gap: '30px' }}>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: 'var(--primary-color)', display: 'block', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px' }}>{layoutTime.toFixed(2)}ms</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>排版开销</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: fps > 50 ? '#10b981' : '#f59e0b', display: 'block', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px' }}>{fps}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>实时帧率</span>
      </div>
    </div>
  </div>
);

export const LizardControls: React.FC<{
  videoUrl: string;
  onVideoUpload: (file: File) => void;
}> = ({ videoUrl, onVideoUpload }) => (
  <div className="pretext-controls" style={{ 
    position: 'absolute', 
    bottom: '25px', 
    left: '25px', 
    background: 'var(--bg-card)', 
    padding: '12px', 
    borderRadius: '12px', 
    border: '1px solid var(--border-color)', 
    zIndex: 100, 
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', 
    width: '200px',
    backdropFilter: 'blur(12px)'
  }}>
    {/* 视频预览窗口 */}
    <div style={{ 
      width: '100%', 
      aspectRatio: '16/9', 
      background: '#000', 
      borderRadius: '6px', 
      overflow: 'hidden', 
      marginBottom: '12px',
      border: '1px solid #333'
    }}>
      <video src={videoUrl} muted autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>

    <div style={{ textAlign: 'center' }}>
      <label style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', marginBottom: '8px', letterSpacing: '1px' }}>参数已固定: 22px / 32px</label>
      <label htmlFor="video-upload" style={{ 
        display: 'block', 
        background: 'var(--primary-color)', 
        color: '#fff', 
        padding: '10px', 
        borderRadius: '8px', 
        textAlign: 'center', 
        fontSize: '12px', 
        cursor: 'pointer', 
        fontWeight: 'bold',
        transition: 'filter 0.2s'
      }}>
        更换绿幕视频
      </label>
      <input id="video-upload" type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onVideoUpload(e.target.files[0])} />
    </div>
  </div>
);
