"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "paused";
type AudioFormat = "webm" | "wav";

export default function Recorder() {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("webm");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // For WAV recording (raw PCM accumulation)
  const wavBufferRef = useRef<Float32Array[]>([]);
  const isCapturePausedRef = useRef<boolean>(false);

  const isRecording = recorderState === "recording";
  const isIdle = recorderState === "idle";

  const timeLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [elapsedMs]);

  useEffect(() => {
    if (!isRecording) return;
    const start = performance.now() - elapsedMs;
    const tick = () => {
      setElapsedMs(Math.max(0, Math.floor(performance.now() - start)));
      timerRef.current = window.setTimeout(tick, 200);
    };
    tick();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setAudioUrl(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup AudioContext for analyser (and WAV capture if needed)
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      sourceNode.connect(analyser);

      if (audioFormat === "webm") {
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        };
        recorder.start();
      } else {
        // WAV capture via ScriptProcessorNode (mono)
        wavBufferRef.current = [];
        isCapturePausedRef.current = false;
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        sourceNode.connect(processor);
        processor.connect(audioContext.destination);
        processor.onaudioprocess = (e) => {
          if (isCapturePausedRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          wavBufferRef.current.push(new Float32Array(input));
        };
      }

      // Start waveform drawing
      drawWaveform();
      setRecorderState("recording");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "マイクの初期化に失敗しました";
      setErrorMessage(message);
      setRecorderState("idle");
    }
  };

  const stopRecording = () => {
    // Stop MediaRecorder if webm
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }

    // Finalize WAV if selected
    if (audioFormat === "wav") {
      const wavBlob = encodeWav(
        wavBufferRef.current,
        audioContextRef.current?.sampleRate || 48000
      );
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
    }

    teardownAudioNodes();
    setRecorderState("idle");
  };

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    chunksRef.current = [];
    setAudioUrl(null);
    setElapsedMs(0);
    setErrorMessage(null);
  };

  const reRecord = async () => {
    clearRecording();
    await startRecording();
  };

  const pauseRecording = () => {
    if (audioFormat === "webm") {
      mediaRecorderRef.current?.pause();
    } else {
      isCapturePausedRef.current = true;
    }
    setRecorderState("paused");
  };

  const resumeRecording = () => {
    if (audioFormat === "webm") {
      mediaRecorderRef.current?.resume();
    } else {
      isCapturePausedRef.current = false;
    }
    setRecorderState("recording");
  };

  const teardownAudioNodes = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    try {
      audioContextRef.current?.close();
    } catch {}
    processorRef.current = null;
    sourceNodeRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteTimeDomainData(dataArray);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "#22c55e"; // green-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  };

  // WAV encoder (mono, 16-bit PCM)
  const encodeWav = (buffers: Float32Array[], sampleRate: number) => {
    const length = buffers.reduce((sum, b) => sum + b.length, 0);
    const interleaved = new Float32Array(length);
    let offset = 0;
    for (const b of buffers) {
      interleaved.set(b, offset);
      offset += b.length;
    }

    // Convert to 16-bit PCM
    const pcmBuffer = new DataView(new ArrayBuffer(interleaved.length * 2));
    let idx = 0;
    for (let i = 0; i < interleaved.length; i++, idx += 2) {
      let s = Math.max(-1, Math.min(1, interleaved[i]));
      pcmBuffer.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const wavBuffer = new DataView(new ArrayBuffer(44 + pcmBuffer.byteLength));

    // RIFF header
    writeString(wavBuffer, 0, "RIFF");
    wavBuffer.setUint32(4, 36 + pcmBuffer.byteLength, true);
    writeString(wavBuffer, 8, "WAVE");
    writeString(wavBuffer, 12, "fmt ");
    wavBuffer.setUint32(16, 16, true); // PCM chunk size
    wavBuffer.setUint16(20, 1, true); // audio format PCM
    wavBuffer.setUint16(22, 1, true); // channels: mono
    wavBuffer.setUint32(24, sampleRate, true);
    wavBuffer.setUint32(28, sampleRate * 2, true); // byte rate (mono 16-bit)
    wavBuffer.setUint16(32, 2, true); // block align
    wavBuffer.setUint16(34, 16, true); // bits per sample
    writeString(wavBuffer, 36, "data");
    wavBuffer.setUint32(40, pcmBuffer.byteLength, true);

    // Copy PCM data after header
    new Uint8Array(wavBuffer.buffer, 44).set(new Uint8Array(pcmBuffer.buffer));
    return new Blob([wavBuffer.buffer], { type: "audio/wav" });
  };

  const writeString = (dv: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      dv.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          形式
          <select
            className="ml-2 rounded border border-gray-300 bg-transparent px-2 py-1 text-sm"
            value={audioFormat}
            onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
            disabled={recorderState !== "idle"}
          >
            <option value="webm">webm</option>
            <option value="wav">wav</option>
          </select>
        </label>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {timeLabel}
      </div>
      <canvas
        ref={canvasRef}
        width={360}
        height={80}
        className="w-[360px] h-[80px] rounded bg-black/10 dark:bg-white/10"
      />
      <div className="flex items-center gap-3">
        {isIdle ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50"
            aria-label="録音開始"
          >
            <span className="sr-only">録音開始</span>
            <span className="block w-3 h-3 bg-white rounded-full" />
          </button>
        ) : recorderState === "recording" ? (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              className="rounded-full bg-amber-600 text-white px-6 py-3 text-sm font-semibold hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
              aria-label="一時停止"
            >
              一時停止
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full bg-gray-800 text-white px-6 py-3 text-sm font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
              aria-label="録音停止"
            >
              録音停止
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={resumeRecording}
            className="rounded-full bg-emerald-600 text-white px-6 py-3 text-sm font-semibold hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
            aria-label="再開"
          >
            再開
          </button>
        )}
      </div>
      {audioUrl && (
        <div className="mt-2 flex items-center gap-3">
          <audio controls src={audioUrl} className="w-64" />
          <a
            download={`recording.${audioFormat}`}
            href={audioUrl}
            className="text-sm underline hover:no-underline"
          >
            ダウンロード
          </a>
          <button
            type="button"
            onClick={reRecord}
            className="text-sm text-emerald-600 hover:text-emerald-500 underline hover:no-underline"
            aria-label="再録音"
          >
            再録音
          </button>
          <button
            type="button"
            onClick={clearRecording}
            className="text-sm text-red-600 hover:text-red-500 underline hover:no-underline"
            aria-label="録音を削除"
          >
            削除
          </button>
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="text-xs text-red-500">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
