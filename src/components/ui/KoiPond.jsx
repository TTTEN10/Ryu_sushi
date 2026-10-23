const COIL_COUNT = 15;

const FISH = [
  { id: 1, classes: 'coil-fish--md coil-fish--mid', style: { top: '0%', left: '-5%', width: '110%' } },
  { id: 2, classes: 'coil-fish--flip coil-fish--lg coil-fish--front coil-fish--slow', style: { top: '12%', left: '0', width: '100%' } },
  { id: 3, classes: 'coil-fish--orange coil-fish--sm coil-fish--back coil-fish--fast', style: { top: '28%', left: '8%', width: '92%' } },
  { id: 4, classes: 'coil-fish--flip coil-fish--orange coil-fish--md coil-fish--mid', style: { top: '42%', left: '-6%', width: '106%' } },
  { id: 5, classes: 'coil-fish--md coil-fish--front', style: { top: '58%', left: '2%', width: '98%' } },
  { id: 6, classes: 'coil-fish--flip coil-fish--sm coil-fish--mid coil-fish--slow', style: { top: '72%', left: '-4%', width: '104%' } },
  { id: 7, classes: 'coil-fish--orange coil-fish--lg coil-fish--back coil-fish--fast', style: { top: '85%', left: '5%', width: '95%' } },
  { id: 8, classes: 'coil-fish--blackwhite coil-fish--md coil-fish--mid coil-fish--slow', style: { top: '15%', left: '10%', width: '90%' } },
];

function CoilFish({ classes, style }) {
  return (
    <div className={`coil-fish ${classes}`} style={style} aria-hidden="true">
      {Array.from({ length: COIL_COUNT }, (_, i) => (
        <div key={i} className="koi-coil" />
      ))}
    </div>
  );
}

export default function KoiPond() {
  return (
    <div className="koi-pond koi-pond--global" aria-hidden="true">
      <div className="koi-pond__sea" />
      {FISH.map((fish) => (
        <CoilFish key={fish.id} classes={fish.classes} style={fish.style} />
      ))}
    </div>
  );
}
