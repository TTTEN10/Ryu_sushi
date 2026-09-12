const INGREDIENTS = ['🍚', '🌸', '✨', '🍃', '🫘', '🌾'];

export default function FloatingIngredients({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="floating-ingredient"
          aria-hidden="true"
          style={{
            top: `${10 + Math.random() * 80}%`,
            left: `${5 + Math.random() * 90}%`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${6 + Math.random() * 4}s`,
            fontSize: `${12 + Math.random() * 8}px`,
          }}
        >
          {INGREDIENTS[i % INGREDIENTS.length]}
        </span>
      ))}
    </>
  );
}
