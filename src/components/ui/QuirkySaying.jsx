import React from 'react';

const quirkySayings = [
  "Stop being broke. It's embarrassing.",
  "Your budget called. It misses you.",
  "Money talks, but wealth whispers.",
  "Budget like your future self is watching.",
  "Financial freedom is calling. Will you answer?",
  "Save now, flex later.",
  "Your wallet will thank you later.",
  "Debt-free is the way to be.",
  "Small steps, big financial gains.",
  "Budget today, prosper tomorrow."
];

export default function QuirkySaying({ className = "" }) {
  const [saying] = React.useState(() => 
    quirkySayings[Math.floor(Math.random() * quirkySayings.length)]
  );

  return (
    <p className={`text-lime-400 italic ${className}`}>
      "{saying}"
    </p>
  );
}