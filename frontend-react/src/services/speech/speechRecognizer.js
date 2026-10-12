import { WebSpeechRecognizer } from "./webSpeechRecognizer";

// Languages offered in the UI. Whether a given one works depends on the
// browser's speech service, not on SignBridge.
export const SPEECH_LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "mr-IN", label: "Marathi" },
  { code: "kn-IN", label: "Kannada" },
];

// Providers share one interface (see webSpeechRecognizer.js), so a server-side
// recognizer can be added here later without touching the call code.
export const createSpeechRecognizer = (provider = "webspeech") => {
  switch (provider) {
    case "webspeech":
      return new WebSpeechRecognizer();
    default:
      throw new Error(`Unknown speech provider: ${provider}`);
  }
};