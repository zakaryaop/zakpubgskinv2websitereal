const COLORS = ["#22d3ee", "#a855f7", "#ec4899", "#84cc16", "#f59e0b", "#22c55e"];

export function fireConfetti(count = 80) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const left = Math.random() * 100;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const duration = 2.5 + Math.random() * 2;
    const delay = Math.random() * 0.6;
    const size = 6 + Math.random() * 6;
    piece.style.left = `${left}vw`;
    piece.style.background = color;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.6}px`;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.borderRadius = Math.random() > 0.5 ? "2px" : "50%";
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + delay) * 1000 + 100);
  }
}
