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
      <h1 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>影像驱动动态排版</h1>
      <p style={{ color: 'var(--text-subtle)', margin: 0, fontSize: '11px' }}>实时绿幕抠像 + Pretext 高性能布局引擎</p>
    </div>
    <div className="pretext-stats" style={{ display: 'flex', gap: '30px' }}>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: 'var(--primary-color)', display: 'block', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px' }}>{layoutTime.toFixed(2)}ms</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>排版耗时</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: fps > 50 ? '#10b981' : '#f59e0b', display: 'block', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px' }}>{fps}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>实时帧率</span>
      </div>
    </div>
  </div>
);

export const LizardControls: React.FC<{
  fontSize: number; setFontSize: (v: number) => void;
  lineHeight: number; setLineHeight: (v: number) => void;
  onVideoUpload: (file: File) => void;
}> = ({ fontSize, setFontSize, lineHeight, setLineHeight, onVideoUpload }) => (
  <div className="pretext-controls" style={{ 
    position: 'absolute', 
    bottom: '25px', 
    left: '25px', 
    background: 'var(--bg-card)', 
    padding: '20px', 
    borderRadius: '12px', 
    border: '1px solid var(--border-color)', 
    zIndex: 100, 
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', 
    width: '240px',
    backdropFilter: 'blur(8px)'
  }}>
    <div style={{ marginBottom: '18px' }}>
      <label style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '11px', marginBottom: '8px', fontWeight: '500' }}>文字大小: {fontSize}px</label>
      <input type="range" min="10" max="22" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary-color)' }} />
    </div>
    <div style={{ marginBottom: '22px' }}>
      <label style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '11px', marginBottom: '8px', fontWeight: '500' }}>行间距: {lineHeight}px</label>
      <input type="range" min="14" max="32" value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary-color)' }} />
    </div>
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
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
        transition: 'opacity 0.2s'
      }}>
        更换绿幕视频
      </label>
      <input id="video-upload" type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onVideoUpload(e.target.files[0])} />
    </div>
  </div>
);
