const FISH = [
  { id: 1, classes: 'koi--pathA koi--md koi--mid', style: { '--koi-dur': '34s', '--koi-delay': '-2s', '--koi-rest': '12%' } },
  { id: 2, classes: 'koi--pathB koi--lg koi--front', style: { '--koi-dur': '27s', '--koi-delay': '-11s', '--koi-rest': '34%' } },
  { id: 3, classes: 'koi--pathA koi--sm koi--back', style: { '--koi-dur': '46s', '--koi-delay': '-20s', '--koi-rest': '58%' } },
  { id: 4, classes: 'koi--pathB koi--orange koi--md koi--mid', style: { '--koi-dur': '31s', '--koi-delay': '-6s', '--koi-rest': '20%' } },
  { id: 5, classes: 'koi--pathA koi--orange koi--sm koi--front', style: { '--koi-dur': '24s', '--koi-delay': '-15s', '--koi-rest': '70%' } },
  { id: 6, classes: 'koi--pathB koi--sumi koi--md koi--back', style: { '--koi-dur': '41s', '--koi-delay': '-9s', '--koi-rest': '46%' } },
  { id: 7, classes: 'koi--pathA koi--lg koi--mid', style: { '--koi-dur': '29s', '--koi-delay': '-24s', '--koi-rest': '84%' } },
  { id: 8, classes: 'koi--pathB koi--sumi koi--sm koi--mid', style: { '--koi-dur': '38s', '--koi-delay': '-3s', '--koi-rest': '62%' } },
];

function Koi({ classes, style }) {
  return (
    <div className={`koi ${classes}`} style={style} aria-hidden="true">
      <span className="koi__tail" />
      <span className="koi__fin koi__fin--top" />
      <span className="koi__fin koi__fin--bottom" />
      <span className="koi__body">
        <span className="koi__patch koi__patch--1" />
        <span className="koi__patch koi__patch--2" />
      </span>
      <span className="koi__eye koi__eye--top" />
      <span className="koi__eye koi__eye--bottom" />
    </div>
  );
}

export default function KoiPond() {
  return (
    <div className="koi-pond koi-pond--global" aria-hidden="true">
      <div className="koi-pond__sea" />
      {FISH.map((fish) => (
        <Koi key={fish.id} classes={fish.classes} style={fish.style} />
      ))}
    </div>
  );
}
