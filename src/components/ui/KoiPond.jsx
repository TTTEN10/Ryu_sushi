const COIL_COUNT = 15;

const FISH = [
  { id: 1, classes: 'coil-fish--pathA coil-fish--md coil-fish--mid', style: { '--koi-dur': '68s', '--koi-delay': '-2s', '--koi-rest': '12%' } },
  { id: 2, classes: 'coil-fish--pathA coil-fish--flip coil-fish--lg coil-fish--front', style: { '--koi-dur': '54s', '--koi-delay': '-11s', '--koi-rest': '34%' } },
  { id: 3, classes: 'coil-fish--pathB coil-fish--orange coil-fish--sm coil-fish--back', style: { '--koi-dur': '92s', '--koi-delay': '-20s', '--koi-rest': '58%' } },
  { id: 4, classes: 'coil-fish--pathA coil-fish--flip coil-fish--orange coil-fish--md coil-fish--mid', style: { '--koi-dur': '62s', '--koi-delay': '-6s', '--koi-rest': '20%' } },
  { id: 5, classes: 'coil-fish--pathA coil-fish--md coil-fish--front', style: { '--koi-dur': '48s', '--koi-delay': '-15s', '--koi-rest': '70%' } },
  { id: 6, classes: 'coil-fish--pathB coil-fish--flip coil-fish--sm coil-fish--mid', style: { '--koi-dur': '82s', '--koi-delay': '-9s', '--koi-rest': '46%' } },
  { id: 7, classes: 'coil-fish--pathB coil-fish--orange coil-fish--lg coil-fish--back', style: { '--koi-dur': '58s', '--koi-delay': '-24s', '--koi-rest': '84%' } },
  { id: 8, classes: 'coil-fish--pathA coil-fish--blackwhite coil-fish--md coil-fish--mid', style: { '--koi-dur': '76s', '--koi-delay': '-3s', '--koi-rest': '62%' } },
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
