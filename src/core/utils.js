function optimalBreaks(parts, maxLength, exponent = 2) {
  const n = parts.length;
  const dp = Array(n).fill(Infinity);
  const startpoint = Array(n).fill(0);
  const lineCost = (l) => Math.abs((l - maxLength) ** exponent);

  for (let i = 0; i < n; i++) {
    if (parts[i] > maxLength) {
      throw new Error(`Part length ${parts[i]} exceeds maxLength ${maxLength}`);
    }
    let length = 0;
    for (let j = i; j >= 0; j--) {
      length += parts[j] + (j < i ? 1 : 0); // account for spaces
      if (length > maxLength) break;
      const cost = lineCost(length) + (j > 0 ? dp[j - 1] : 0);
      if (cost < dp[i]) {
        dp[i] = cost;
        startpoint[i] = j;
      }
    }
  }

  const lines = [];
  let curr = n - 1;
  while (curr >= 0) {
    lines.push(startpoint[curr]);
    curr = startpoint[curr] - 1;
  }
  return lines.reverse();
}

export function splitTextIntoBatches(text, maxChars = 200, splitWords = null) {
  // Normalize all whitespace to single spaces
  text = text.replace(/\s+/g, " ").trim();

  // Ensure ending punctuation
  if (text && !"。.!！?？".includes(text[text.length - 1])) {
    text += ".";
  }

  // Hierarchical splitters in order of preference
  const splitters = [
    /(?<=[。.!?！？])\s*/g, // After sentence endings
    /(?<=[:：])\s*/g, // After colons
    /(?<=[,，])\s*/g, // After commas
    /\s+/g, // By whitespace
  ];

  if (splitWords) {
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordsPattern = splitWords
      .map((w) => `(?<![a-zA-Z])${escapeRegex(w)}(?![a-zA-Z])`)
      .join("|");
    const pattern = new RegExp(`\\s+(?=${wordsPattern})`, "gi");
    splitters.splice(-1, 0, pattern); // Insert before final whitespace splitter
  }

  function recursiveSplit(text, level) {
    if (text.length <= maxChars || level >= splitters.length) {
      return [text];
    }
    return text
      .split(splitters[level])
      .filter((part) => part.length)
      .flatMap((part) => (part.length > maxChars ? recursiveSplit(part, level + 1) : [part]));
  }

  const atomicParts = recursiveSplit(text, 0);
  const breaks = optimalBreaks(
    atomicParts.map((p) => p.length),
    maxChars
  );

  return breaks.map((s, i) => {
    const t = breaks[i + 1] ?? atomicParts.length;
    return atomicParts.slice(s, t).join(" ");
  });
}
