"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  text: string;
  lang?: string;
};

export default function SpeakButton({ text, lang = "en-US" }: Props) {
  const [available, setAvailable] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const utterance = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new SpeechSynthesisUtterance(text);
  }, [text]);

  const speak = () => {
    if (!available || !utterance) return;
    const preferred =
      voices.find((voice) => voice.lang === lang && voice.name.includes("Google")) ??
      voices.find((voice) => voice.lang === lang) ??
      voices.find((voice) => voice.lang.startsWith("en") && voice.name.includes("Google")) ??
      voices.find((voice) => voice.lang.startsWith("en")) ??
      voices[0];
    if (preferred) {
      utterance.voice = preferred;
      utterance.lang = preferred.lang;
    } else {
      utterance.lang = lang;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={speak}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 text-[color:var(--muted)] transition hover:border-black/20 hover:text-[color:var(--text)] cursor-pointer"
      title="Listen"
      aria-label={`Speak ${text}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M11 5.3 7.5 8H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3.5l3.5 2.7a1 1 0 0 0 1.6-.8V6.1a1 1 0 0 0-1.6-.8ZM15.5 8.5a1 1 0 0 1 1.4 0 5 5 0 0 1 0 7.1 1 1 0 1 1-1.4-1.4 3 3 0 0 0 0-4.3 1 1 0 0 1 0-1.4Zm2.8-2.8a1 1 0 0 1 1.4 0 9 9 0 0 1 0 12.7 1 1 0 1 1-1.4-1.4 7 7 0 0 0 0-9.9 1 1 0 0 1 0-1.4Z" />
      </svg>
    </button>
  );
}
