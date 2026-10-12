import { formatDuration } from "./formatDuration.js";

export const buildTranscriptText = ({ entries, peerName, startedAt }) => {
  const header = [
    `SignBridge call transcript${peerName ? ` with ${peerName}` : ""}`,
    startedAt ? `Started: ${new Date(startedAt).toLocaleString()}` : null,
    "",
  ].filter((l) => l !== null);

  const lines = entries.map((e) => {
    const who = e.speaker === "ME" ? "You" : peerName || "Them";
    const how = e.source === "SPEECH" ? "speech" : "signs";
    const offset = startedAt ? formatDuration(e.at - startedAt) : new Date(e.at).toLocaleTimeString();
    return `[${offset}] ${who} (${how}): ${e.text}`;
  });

  return [...header, ...lines].join("\n") + "\n";
};