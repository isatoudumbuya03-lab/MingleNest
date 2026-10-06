import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { privateAudioUrl } from './privateChat'

export const voiceTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
export default function VoicePlayer({ path, durationMs }: { path: string; durationMs: number }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [url, setUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  useEffect(() => {
    let live = true
    let objectUrl = ''
    privateAudioUrl(path).then(value => {
      objectUrl = value
      if (live) setUrl(value)
      else URL.revokeObjectURL(value)
    }).catch(() => { if (live) setError(true) })
    return () => { live = false; audio.current?.pause(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path])
  const toggle = async () => {
    const element = audio.current
    if (!element || !url) return
    if (!element.paused) { element.pause(); return }
    try {
      if (element.ended) element.currentTime = 0
      await element.play()
    } catch {
      try { const fresh = await privateAudioUrl(path); if (url.startsWith('blob:')) URL.revokeObjectURL(url); setUrl(fresh); element.src = fresh; await element.play() } catch { setError(true) }
    }
  }
  return <div className="voice-player"><button type="button" onClick={toggle} disabled={!url || error} aria-label={playing ? 'Pause voice message' : 'Play voice message'}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><div className="voice-track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Voice playback progress"><span style={{ width: `${progress * 100}%` }} /></div><span>{error ? 'Unavailable' : voiceTime(durationMs)}</span><audio ref={audio} preload="none" src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0) }} onTimeUpdate={event => { const el = event.currentTarget; setProgress(el.duration ? el.currentTime / el.duration : 0) }} /></div>
}
