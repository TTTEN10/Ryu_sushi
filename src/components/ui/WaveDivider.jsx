export default function WaveDivider({ flip = false, color = 'var(--cream)' }) {
  return (
    <div className="wave-divider" style={{ transform: flip ? 'rotate(180deg)' : 'none' }}>
      <div className="wave-divider__layer wave-divider__layer--1">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z"
            fill={color}
            opacity="0.6"
          />
        </svg>
      </div>
      <div className="wave-divider__layer wave-divider__layer--2">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,80 C360,20 720,100 1080,40 C1260,10 1380,60 1440,80 L1440,120 L0,120 Z"
            fill={color}
          />
        </svg>
      </div>
      <div className="wave-divider__layer wave-divider__layer--3">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,90 C480,30 960,110 1440,50 L1440,120 L0,120 Z"
            fill={color}
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
}
