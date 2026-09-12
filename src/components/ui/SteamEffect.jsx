export default function SteamEffect() {
  return (
    <div className="steam-container" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="steam-particle"
          style={{
            left: `${20 + i * 12}%`,
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${2.5 + i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
