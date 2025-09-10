import Logger from "../logging";

const LOG = Logger.get("Utils");

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

export function splitGenText({
  genText,
  refText,
  refAudioLength,
  maxOutputLength,
  speed = 1,
  splitWords = [],
  maxChars = Infinity,
}) {
  const density = new TextEncoder().encode(refText).length / refAudioLength;
  LOG.debug(
    `Reference text is ${new TextEncoder().encode(refText).length} chars for ${refAudioLength} seconds of audio.`
  );
  LOG.debug(`Text density is ${density} chars/sec`);
  const estMaxChars = density * (maxOutputLength - refAudioLength) * speed;
  LOG.debug("Estimated max chars per segment:", estMaxChars);
  return splitTextIntoBatches(genText, Math.min(estMaxChars, maxChars), splitWords);
}

export function downloadProgressTracker(onProgress) {
  const downloads = {};

  return (info) => {
    const { status, file, loaded, total } = info;

    if (!(status === "progress" || status === "done")) {
      return;
    }

    if (!downloads[file]) {
      downloads[file] = { loaded: 0, total: 0 };
    }

    if (status === "progress") {
      downloads[file].loaded = loaded;
      downloads[file].total = total;
    } else if (status === "done") {
      downloads[file].loaded = downloads[file].total;
    }

    const totalLoaded = Object.values(downloads).reduce((sum, d) => sum + d.loaded, 0);
    const totalSize = Object.values(downloads).reduce((sum, d) => sum + d.total, 0);

    onProgress({
      numberOfFiles: Object.keys(downloads).length,
      currentMB: totalLoaded / (1024 * 1024),
      totalMB: totalSize / (1024 * 1024),
    });
  };
}

export function defaultDownloadProgressCallback({
  emit,
  messagePrefix = "Downloading model files",
}) {
  return downloadProgressTracker(({ numberOfFiles, currentMB, totalMB }) => {
    emit("download", {
      value: totalMB ? (currentMB / totalMB) * 100 : 0,
      message: `${messagePrefix}... (${currentMB.toFixed(1)} MB of ${totalMB.toFixed(1)} MB)`,
    });
  });
}
