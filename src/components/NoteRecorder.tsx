"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitNote, type NoteFormState } from "@/app/actions/sales";
import { MicIcon } from "./BottomNav";

type Acc = { id: string; name: string; city: string | null };

/**
 * Enregistrement de la note vocale.
 * Mode démo : l'audio est capté par le micro mais n'est pas envoyé ; la transcription est
 * simulée (texte d'exemple modifiable). Phase suivante : envoi de l'audio au service de
 * transcription UE, puis suppression de l'audio.
 */
export function NoteRecorder(props: {
  mine: Acc[];
  others: Acc[];
  defaultAccountId?: string;
  visitId?: string;
  demoTranscript: string;
  demoMode: boolean;
}) {
  const [state, action, pending] = useActionState<NoteFormState, FormData>(submitNote, {});
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stopAll(), []);

  function stopAll() {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    setMicError(null);
    setSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.start();
      recorder.current = rec;
    } catch {
      setMicError("Micro indisponible : la démo continue sans enregistrement réel.");
    }
    setPhase("recording");
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    stopAll();
    setPhase("done");
    if (!transcript) setTranscript(props.demoMode ? props.demoTranscript : "");
  }

  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <form action={action} className="space-y-5 px-4 py-4">
      <input type="hidden" name="visitId" value={props.visitId ?? ""} />
      <input type="hidden" name="durationSec" value={seconds} />

      <label className="block">
        <span className="label">Client</span>
        <select name="accountId" defaultValue={props.defaultAccountId ?? ""} required className="input mt-1">
          <option value="" disabled>Choisir un client…</option>
          <optgroup label="Mes clients">
            {props.mine.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
            ))}
          </optgroup>
          {props.others.length > 0 && (
            <optgroup label="Autres clients">
              {props.others.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <div className="card flex flex-col items-center gap-3 p-6">
        {phase !== "recording" ? (
          <button
            type="button"
            onClick={start}
            className="grid h-24 w-24 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30 active:scale-95"
            aria-label="Commencer l'enregistrement"
          >
            <MicIcon className="h-10 w-10" />
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="relative grid h-24 w-24 place-items-center rounded-full bg-rose-600 text-white shadow-xl shadow-rose-600/30 active:scale-95"
            aria-label="Arrêter l'enregistrement"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />
            <span className="h-8 w-8 rounded-md bg-white" />
          </button>
        )}
        <p className="text-sm text-zinc-600">
          {phase === "idle" && "Appuyez pour dicter votre compte rendu"}
          {phase === "recording" && <span className="font-semibold tabular-nums text-rose-600">Enregistrement… {mm}</span>}
          {phase === "done" && (seconds > 0 ? `Note de ${mm} enregistrée` : "Note enregistrée")}
        </p>
        {micError && <p className="text-center text-xs text-amber-700">{micError}</p>}
      </div>

      <label className="block">
        <span className="label">Transcription</span>
        {props.demoMode && (
          <span className="mt-0.5 block text-xs text-zinc-500">Mode démo : transcription simulée, vous pouvez la modifier ou taper votre propre note.</span>
        )}
        <textarea
          name="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          placeholder="La transcription apparaîtra ici après l'enregistrement…"
          className="input mt-1 leading-relaxed"
        />
      </label>

      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}

      <button disabled={pending || transcript.trim().length < 20 || phase === "recording"} className="btn-primary w-full py-3">
        {pending ? "Analyse en cours…" : "Analyser la note"}
      </button>
      <p className="text-center text-xs text-zinc-500">Rien n&apos;est envoyé ni modifié avant votre validation.</p>
    </form>
  );
}
