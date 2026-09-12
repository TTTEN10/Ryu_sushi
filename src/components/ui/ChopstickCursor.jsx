import { useChopstickCursor } from '../../hooks';

export default function ChopstickCursor() {
  const { pos, visible } = useChopstickCursor(true);

  if (!visible) return null;

  return (
    <div
      className="chopstick-cursor-active"
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
    >
      <div className="chopstick-cursor-active__stick" />
      <div className="chopstick-cursor-active__stick" />
    </div>
  );
}
