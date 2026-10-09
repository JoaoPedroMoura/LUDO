const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Dice({
  value,
  canRoll,
  onRoll,
}: {
  value: number | undefined;
  canRoll: boolean;
  onRoll: () => void;
}) {
  const pips = value ? PIPS[value] : [];
  return (
    <button
      className={`dice${canRoll ? " can-roll" : ""}`}
      disabled={!canRoll}
      onClick={onRoll}
      aria-label="rolar dado"
    >
      <div className="dice-face">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={pips?.includes(i) ? "pip on" : "pip"} />
        ))}
      </div>
    </button>
  );
}
