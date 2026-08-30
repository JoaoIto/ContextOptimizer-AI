import { useState, useEffect } from 'react';

export function useSimulationPacing(incomingText: string, speedMs: number = 20) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!incomingText) {
      if (displayedText !== "") setDisplayedText("");
      return;
    }

    if (displayedText === incomingText) return;

    if (incomingText.startsWith(displayedText)) {
      // Avança o texto caractere por caractere (ou blocos)
      let nextChunkLength = 2; // de 2 em 2 chars por tick
      const remaining = incomingText.length - displayedText.length;
      if (remaining > 50) nextChunkLength = 8; // acelera se estiver muito para trás
      if (remaining > 200) nextChunkLength = 20;

      const timeout = setTimeout(() => {
        setDisplayedText(incomingText.substring(0, displayedText.length + nextChunkLength));
      }, speedMs);
      return () => clearTimeout(timeout);
    } else {
      // Se o texto não for um append perfeito, ajusta para o texto real (fallback)
      setDisplayedText(incomingText);
    }
  }, [incomingText, displayedText, speedMs]);

  return displayedText;
}
