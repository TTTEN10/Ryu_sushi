import { useEffect, useState } from 'react';
const logoImg = '/images/ryu-logo.png';

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('exit');
      setTimeout(onComplete, 600);
    }, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="loading-screen"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 600ms cubic-bezier(0.22, 0.61, 0.36, 1)',
      }}
      role="alert"
      aria-label="Chargement du site Ryu Sushi"
    >
      <img src={logoImg} alt="Ryu Sushi" className="loading-screen__logo" />
      <div className="loading-screen__stamp" aria-hidden="true">龍</div>
    </div>
  );
}
