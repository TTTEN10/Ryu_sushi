const LANTERNS = [
  { top: '10%', left: '6%',  delay: '0s',   size: 'md', kanji: '食' },
  { top: '18%', right: '8%', delay: '1.2s', size: 'lg', kanji: '寿' },
  { top: '6%',  left: '42%', delay: '0.6s', size: 'sm', kanji: '鮨' },
  { top: '14%', right: '28%', delay: '2s',  size: 'md', kanji: '福' },
  { top: '22%', left: '22%', delay: '1.8s', size: 'sm', kanji: '龍' },
];

export default function Lanterns() {
  return (
    <div className="lanterns-scene" aria-hidden="true">
      {LANTERNS.map((l, i) => (
        <div
          key={i}
          className={`lantern lantern--${l.size}`}
          style={{ top: l.top, left: l.left, right: l.right, animationDelay: l.delay }}
        >
          <div className="lantern__cord" />
          <div className="lantern__hook" />
          <div className="lantern__cap lantern__cap--top" />
          <div className="lantern__paper">
            <div className="lantern__ribs" />
            <span className="lantern__kanji">{l.kanji}</span>
            <div className="lantern__inner-glow" />
          </div>
          <div className="lantern__cap lantern__cap--bottom" />
          <div className="lantern__tassel">
            <div className="lantern__tassel-knot" />
            <div className="lantern__tassel-strands" />
          </div>
          <div className="lantern__light-pool" />
        </div>
      ))}
    </div>
  );
}
