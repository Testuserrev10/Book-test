"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Note = {
  name: string;
  key: string;
  frequency: number;
  black?: boolean;
};

const BASE_NOTES = [
  ["C", "a"], ["C♯", "w", true], ["D", "s"], ["D♯", "e", true], ["E", "d"],
  ["F", "f"], ["F♯", "t", true], ["G", "g"], ["G♯", "y", true], ["A", "h"],
  ["A♯", "u", true], ["B", "j"],
] as const;

function makeNotes(octave: number): Note[] {
  return BASE_NOTES.map(([name, key, black], index) => ({
    name,
    key,
    black,
    frequency: 261.63 * 2 ** ((octave - 4) + index / 12),
  }));
}

export default function Home() {
  const [octave, setOctave] = useState(4);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [sustain, setSustain] = useState(false);
  const [volume, setVolume] = useState(72);
  const [audioReady, setAudioReady] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const voices = useRef(new Map<string, { oscillator: OscillatorNode; gain: GainNode }>());

  const notes = useMemo(() => makeNotes(octave), [octave]);
  const allKeys = useMemo(() => [...notes, ...makeNotes(octave + 1).slice(0, 1)], [notes, octave]);

  const ensureAudio = useCallback(() => {
    if (audioContext.current) return audioContext.current;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      setAudioReady(false);
      return null;
    }
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.value = volume / 100;
    gain.connect(context.destination);
    audioContext.current = context;
    masterGain.current = gain;
    return context;
  }, [volume]);

  useEffect(() => {
    if (masterGain.current) masterGain.current.gain.value = volume / 100;
  }, [volume]);

  const playNote = useCallback((note: Note) => {
    const context = ensureAudio();
    if (!context || voices.current.has(note.key)) return;
    if (context.state === "suspended") void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.34, context.currentTime + 0.025);
    oscillator.connect(gain);
    gain.connect(masterGain.current!);
    oscillator.start();
    voices.current.set(note.key, { oscillator, gain });
    setActiveKeys((current) => (current.includes(note.key) ? current : [...current, note.key]));
  }, [ensureAudio]);

  const stopNote = useCallback((note: Note) => {
    const voice = voices.current.get(note.key);
    if (!voice) return;
    const context = audioContext.current;
    if (!context) return;
    const release = sustain ? 0.55 : 0.12;
    voice.gain.gain.cancelScheduledValues(context.currentTime);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), context.currentTime);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + release);
    voice.oscillator.stop(context.currentTime + release + 0.02);
    voices.current.delete(note.key);
    setActiveKeys((current) => current.filter((key) => key !== note.key));
  }, [sustain]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const note = allKeys.find((item) => item.key === event.key.toLowerCase());
      if (note) { event.preventDefault(); playNote(note); }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const note = allKeys.find((item) => item.key === event.key.toLowerCase());
      if (note) stopNote(note);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [allKeys, playNote, stopNote]);

  const shiftOctave = (amount: number) => setOctave((current) => Math.min(6, Math.max(2, current + amount)));

  return (
    <main className="studio-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand"><span className="brand-mark">◒</span><span>sonora</span></div>
        <div className="topbar-center"><span className="live-dot" /> live instrument <span className="separator">/</span> studio 01</div>
        <button className="icon-button" aria-label="Open settings">•••</button>
      </nav>

      <section className="hero" aria-labelledby="page-title">
        <div className="eyebrow"><span className="eyebrow-line" /> digital piano</div>
        <h1 id="page-title">Find your <em>sound.</em></h1>
        <p>Every note is a small beginning. Play something beautiful.</p>
      </section>

      <section className="instrument-panel" aria-label="Virtual piano instrument">
        <div className="panel-topline">
          <div><span className="panel-label">Instrument</span><strong>Velvet Grand</strong></div>
          <div className="signal"><span className="signal-bars"><i /><i /><i /></span> ready to play</div>
        </div>
        <div className="controls-row">
          <div className="octave-control"><span className="control-label">Octave</span><button onClick={() => shiftOctave(-1)} aria-label="Lower octave">−</button><span className="octave-number">{octave}</span><button onClick={() => shiftOctave(1)} aria-label="Raise octave">+</button></div>
          <div className="keyboard-hint"><kbd>A</kbd><span>—</span><kbd>J</kbd><span>use your keyboard to play</span></div>
          <div className="volume-control"><span className="control-label">Volume</span><input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></div>
        </div>

        <div className="keys-wrap">
          <div className="piano-keys" role="group" aria-label="Piano keys">
            {notes.map((note) => <button key={note.key} className={`piano-key ${note.black ? "black-key" : "white-key"} ${activeKeys.includes(note.key) ? "active" : ""}`} onPointerDown={() => playNote(note)} onPointerUp={() => stopNote(note)} onPointerLeave={() => activeKeys.includes(note.key) && stopNote(note)} aria-label={`${note.name}, keyboard key ${note.key}`}><span>{note.name}</span><small>{note.key.toUpperCase()}</small></button>)}
          </div>
          {!audioReady && <div className="audio-error" role="alert">Audio is unavailable in this browser. Try a current version of Chrome, Safari, or Firefox.</div>}
        </div>
        <div className="panel-footer"><span>Press a key to begin</span><button className={`sustain ${sustain ? "on" : ""}`} onClick={() => setSustain((current) => !current)} aria-pressed={sustain}><span className="sustain-dot" /> sustain <span className="switch"><span /></span></button></div>
      </section>

      <footer className="footer"><span>made for late nights &amp; early mornings</span><span>♢ &nbsp; sound is a feeling</span></footer>
    </main>
  );
}
