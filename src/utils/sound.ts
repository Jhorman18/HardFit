/**
 * Audio and haptic feedback utilities for workout and rest timer.
 */

export function playTimerBeep(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()

    // Create dual-tone beep for a crisp gym timer alert
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    // 880Hz (A5) ramping up slightly to 1046Hz (C6)
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1046, now + 0.15)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.03)
    gain.gain.setValueAtTime(0.3, now + 0.25)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.4)

    // Clean up audio context after playback
    setTimeout(() => {
      ctx.close().catch(() => {})
    }, 600)
  } catch (err) {
    console.warn('Web Audio playback failed or not allowed:', err)
  }
}

export function triggerTimerVibration(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(400)
    }
  } catch (err) {
    console.warn('Vibration API not supported:', err)
  }
}

export function notifyTimerFinished(): void {
  playTimerBeep()
  triggerTimerVibration()
}
