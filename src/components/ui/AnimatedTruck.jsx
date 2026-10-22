const logoImg = '/images/ryu-logo.png';

const PANEL_KOI = [
  { cls: 'truck__panel-koi--1', reverse: false },
  { cls: 'truck__panel-koi--2', reverse: true },
  { cls: 'truck__panel-koi--3', reverse: false },
  { cls: 'truck__panel-koi--4', reverse: false },
  { cls: 'truck__panel-koi--5', reverse: true },
  { cls: 'truck__panel-koi--6', reverse: false },
];

function PanelKoi({ cls, reverse }) {
  return (
    <div className={`truck__panel-koi ${cls} ${reverse ? 'truck__panel-koi--reverse' : ''}`} aria-hidden="true">
      <div className="truck__panel-koi-inner">
        <div className="truck__panel-koi-head">
          <div className="truck__panel-koi-eye" />
        </div>
        <div className="truck__panel-koi-body">
          <div className="truck__panel-koi-spot truck__panel-koi-spot--1" />
          <div className="truck__panel-koi-spot truck__panel-koi-spot--2" />
        </div>
        <div className="truck__panel-koi-tail">
          <div className="truck__panel-koi-tail-fin truck__panel-koi-tail-fin--top" />
          <div className="truck__panel-koi-tail-fin truck__panel-koi-tail-fin--bottom" />
        </div>
        <div className="truck__panel-koi-fin" />
      </div>
    </div>
  );
}

export default function AnimatedTruck() {
  return (
    <div className="truck-scene" aria-label="Ryu Sushi food truck illustration">
      <div className="truck__ground-shadow" aria-hidden="true" />

      <div className="truck">
        <div className="truck__wheel-arch truck__wheel-arch--front" aria-hidden="true" />
        <div className="truck__wheel-arch truck__wheel-arch--back" aria-hidden="true" />

        <div className="truck__wheel truck__wheel--front" aria-hidden="true">
          <div className="truck__wheel-tire">
            <div className="truck__wheel-rim">
              <div className="truck__wheel-spokes" />
              <div className="truck__wheel-cap" />
            </div>
          </div>
        </div>
        <div className="truck__wheel truck__wheel--back" aria-hidden="true">
          <div className="truck__wheel-tire">
            <div className="truck__wheel-rim">
              <div className="truck__wheel-spokes" />
              <div className="truck__wheel-cap" />
            </div>
          </div>
        </div>

        <div className="truck__cab" aria-hidden="true">
          <div className="truck__cab-body">
            <div className="truck__cab-window" />
            <div className="truck__cab-door-line" />
          </div>
        </div>

        <div className="truck__box">
          <div className="truck__box-body">
            <div className="truck__roof">
              <div className="truck__roof-rack" />
              <div className="truck__antenna" />
            </div>

            <div className="truck__back-panel">
              <div className="truck__logo-zone">
                <img src={logoImg} alt="" className="truck__logo-img" loading="lazy" aria-hidden="true" />
              </div>
              <div className="truck__phone-strip">
                <span className="truck__phone">07 88 42 15 46</span>
              </div>
              <div className="truck__koi-panel">
                <div className="truck__koi-water-shimmer" aria-hidden="true" />
                <div className="truck__koi-water-surface" aria-hidden="true" />
                {PANEL_KOI.map((k) => (
                  <PanelKoi key={k.cls} cls={k.cls} reverse={k.reverse} />
                ))}
              </div>
            </div>

            <div className="truck__side-text" aria-hidden="true">
              <span>新鮮</span>
              <span>寿司</span>
            </div>
          </div>
        </div>

        <div className="truck__side" aria-hidden="true">
          <div className="truck__awning-frame" />
          <div className="truck__awning-fabric" />
          <div className="truck__serve-window" />
          <div className="truck__serve-counter" />
        </div>

        <div className="truck__lantern-wrap" aria-hidden="true">
          <div className="truck__lantern-string" />
          <div className="truck__lantern-cap" />
          <div className="truck__lantern-paper" />
          <div className="truck__lantern-base" />
          <div className="truck__lantern-tassel" />
        </div>

        <div className="truck__bumper" aria-hidden="true" />
        <div className="truck__step" aria-hidden="true" />
      </div>
    </div>
  );
}
