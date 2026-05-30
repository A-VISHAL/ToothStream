import { useCallback, useEffect, useRef } from 'react';

export type ClinicalSoundType = 'navigation' | 'commit' | 'bleeding' | 'undo' | 'acknowledgment';

export type ClinicalSoundTrigger =
  | 'button_click'
  | 'start_recording'
  | 'jump_to'
  | 'go_to'
  | 'select_tooth'
  | 'select_surface'
  | 'cursor_jump'
  | 'triplet_commit'
  | 'bleeding_true'
  | 'undo'
  | 'missing_implant'
  | 'manual';

type SoundStep = {
  frequency: number;
  duration: number;
  delay: number;
  gain: number;
  waveform: OscillatorType;
};

type SoundProfile = {
  steps: SoundStep[];
  masterGain: number;
};

const SOUND_LIBRARY: Record<ClinicalSoundType, SoundProfile> = {
  navigation: {
    masterGain: 0.045,
    steps: [
      { frequency: 1580, duration: 0.024, delay: 0, gain: 0.018, waveform: 'sine' },
      { frequency: 1210, duration: 0.018, delay: 0.022, gain: 0.012, waveform: 'triangle' },
    ],
  },
  commit: {
    masterGain: 0.05,
    steps: [
      { frequency: 920, duration: 0.03, delay: 0, gain: 0.019, waveform: 'sine' },
      { frequency: 740, duration: 0.024, delay: 0.018, gain: 0.013, waveform: 'triangle' },
    ],
  },
  bleeding: {
    masterGain: 0.04,
    steps: [
      { frequency: 784, duration: 0.032, delay: 0, gain: 0.015, waveform: 'sine' },
      { frequency: 1046.5, duration: 0.04, delay: 0.028, gain: 0.012, waveform: 'sine' },
    ],
  },
  undo: {
    masterGain: 0.05,
    steps: [
      { frequency: 880, duration: 0.026, delay: 0, gain: 0.015, waveform: 'triangle' },
      { frequency: 540, duration: 0.04, delay: 0.022, gain: 0.013, waveform: 'sine' },
    ],
  },
  acknowledgment: {
    masterGain: 0.035,
    steps: [{ frequency: 620, duration: 0.05, delay: 0, gain: 0.012, waveform: 'sine' }],
  },
};

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function hasUserActivation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithActivation = window.navigator as Navigator & {
    userActivation?: {
      hasBeenActive?: boolean;
    };
  };

  return navigatorWithActivation.userActivation?.hasBeenActive === true;
}

function logAudioEvent(
  status: 'unlocked' | 'skipped' | 'blocked' | 'success' | 'failure',
  details: { sound?: ClinicalSoundType; trigger?: ClinicalSoundTrigger; reason?: string } = {}
) {
  const parts = [`sound=${details.sound ?? 'n/a'}`, `trigger=${details.trigger ?? 'manual'}`, `play=${status}`];

  if (details.reason) {
    parts.push(`reason=${details.reason}`);
  }

  console.info(`[Perio UI][Audio] ${parts.join(' ')}`);
}

async function ensureAudioContext(
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  unlockReason: ClinicalSoundTrigger
): Promise<AudioContext | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    logAudioEvent('failure', { trigger: unlockReason, reason: 'audio-context-unavailable' });
    return null;
  }

  const audioContext = audioContextRef.current ?? new AudioContextConstructor();
  audioContextRef.current = audioContext;

  if (audioContext.state === 'suspended' && !hasUserActivation()) {
    return audioContext;
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  return audioContext;
}

function scheduleSound(audioContext: AudioContext, profile: SoundProfile) {
  const output = audioContext.createGain();
  output.gain.value = profile.masterGain;
  output.connect(audioContext.destination);

  const now = audioContext.currentTime;

  for (const step of profile.steps) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = step.waveform;
    oscillator.frequency.value = step.frequency;

    const filter = audioContext.createBiquadFilter();
    filter.type = step.frequency >= 1000 ? 'highpass' : 'lowpass';
    filter.frequency.value = step.frequency >= 1000 ? 900 : 1800;
    filter.Q.value = 0.8;

    const stepGain = audioContext.createGain();
    stepGain.gain.setValueAtTime(0.0001, now + step.delay);
    stepGain.gain.linearRampToValueAtTime(step.gain, now + step.delay + 0.007);
    stepGain.gain.exponentialRampToValueAtTime(0.0001, now + step.delay + step.duration);

    oscillator.connect(filter);
    filter.connect(stepGain);
    stepGain.connect(output);

    oscillator.start(now + step.delay);
    oscillator.stop(now + step.delay + step.duration + 0.01);

    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      stepGain.disconnect();
    };
  }

  window.setTimeout(() => {
    output.disconnect();
  }, 250);
}

export function useClinicalSoundManager(enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  const unlockAudio = useCallback(async (trigger: ClinicalSoundTrigger = 'button_click') => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const audioContext = await ensureAudioContext(audioContextRef, trigger);

      if (!audioContext) {
        logAudioEvent('failure', { trigger, reason: 'context-missing' });
        return false;
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;
      unlockedRef.current = true;
      logAudioEvent('unlocked', { trigger });
      return true;
    } catch (error) {
      logAudioEvent('failure', { trigger, reason: error instanceof Error ? error.message : 'unlock-failed' });
      return false;
    }
  }, []);

  const playSound = useCallback(
    async (sound: ClinicalSoundType, trigger: ClinicalSoundTrigger = 'manual') => {
      if (!enabled) {
        logAudioEvent('skipped', { sound, trigger, reason: 'sound-disabled' });
        return false;
      }

      try {
        const audioContext = await ensureAudioContext(audioContextRef, trigger);

        if (!audioContext) {
          logAudioEvent('failure', { sound, trigger, reason: 'context-missing' });
          return false;
        }

        if (audioContext.state === 'suspended') {
          if (!unlockedRef.current && !hasUserActivation()) {
            logAudioEvent('blocked', { sound, trigger, reason: 'awaiting-user-gesture' });
            return false;
          }

          await audioContext.resume();
          unlockedRef.current = true;
        }

        scheduleSound(audioContext, SOUND_LIBRARY[sound]);
        logAudioEvent('success', { sound, trigger });
        return true;
      } catch (error) {
        logAudioEvent('failure', { sound, trigger, reason: error instanceof Error ? error.message : 'playback-failed' });
        return false;
      }
    },
    [enabled]
  );

  useEffect(() => {
    const audioContext = audioContextRef.current;

    if (!audioContext) {
      return;
    }

    if (!enabled && audioContext.state === 'running') {
      void audioContext.suspend();
      return;
    }

    if (enabled && audioContext.state === 'suspended' && unlockedRef.current) {
      void audioContext.resume();
    }
  }, [enabled]);

  useEffect(
    () => () => {
      const audioContext = audioContextRef.current;

      if (audioContext) {
        void audioContext.close();
      }
    },
    []
  );

  return {
    unlockAudio,
    playSound,
  };
}