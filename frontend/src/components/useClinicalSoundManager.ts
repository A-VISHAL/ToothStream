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

const DEBUG_AUDIO_TUNING_MODE = true;

const SOUND_LIBRARY: Record<ClinicalSoundType, SoundProfile> = {
  navigation: {
    masterGain: DEBUG_AUDIO_TUNING_MODE ? 0.24 : 0.07,
    steps: [
      { frequency: 1120, duration: DEBUG_AUDIO_TUNING_MODE ? 0.18 : 0.06, delay: 0, gain: DEBUG_AUDIO_TUNING_MODE ? 0.18 : 0.03, waveform: 'sine' },
      { frequency: 960, duration: DEBUG_AUDIO_TUNING_MODE ? 0.14 : 0.042, delay: DEBUG_AUDIO_TUNING_MODE ? 0.08 : 0.028, gain: DEBUG_AUDIO_TUNING_MODE ? 0.14 : 0.02, waveform: 'triangle' },
    ],
  },
  commit: {
    masterGain: DEBUG_AUDIO_TUNING_MODE ? 0.26 : 0.075,
    steps: [
      { frequency: 860, duration: DEBUG_AUDIO_TUNING_MODE ? 0.2 : 0.07, delay: 0, gain: DEBUG_AUDIO_TUNING_MODE ? 0.2 : 0.033, waveform: 'sine' },
      { frequency: 720, duration: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.05, delay: DEBUG_AUDIO_TUNING_MODE ? 0.085 : 0.026, gain: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.022, waveform: 'triangle' },
    ],
  },
  bleeding: {
    masterGain: DEBUG_AUDIO_TUNING_MODE ? 0.28 : 0.065,
    steps: [
      { frequency: 1380, duration: DEBUG_AUDIO_TUNING_MODE ? 0.2 : 0.08, delay: 0, gain: DEBUG_AUDIO_TUNING_MODE ? 0.2 : 0.025, waveform: 'sine' },
      { frequency: 1490, duration: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.055, delay: DEBUG_AUDIO_TUNING_MODE ? 0.08 : 0.03, gain: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.018, waveform: 'sine' },
    ],
  },
  undo: {
    masterGain: DEBUG_AUDIO_TUNING_MODE ? 0.24 : 0.07,
    steps: [
      { frequency: 880, duration: DEBUG_AUDIO_TUNING_MODE ? 0.18 : 0.07, delay: 0, gain: DEBUG_AUDIO_TUNING_MODE ? 0.18 : 0.03, waveform: 'triangle' },
      { frequency: 620, duration: DEBUG_AUDIO_TUNING_MODE ? 0.18 : 0.06, delay: DEBUG_AUDIO_TUNING_MODE ? 0.1 : 0.03, gain: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.022, waveform: 'sine' },
    ],
  },
  acknowledgment: {
    masterGain: DEBUG_AUDIO_TUNING_MODE ? 0.22 : 0.05,
    steps: [{ frequency: 680, duration: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.06, delay: 0, gain: DEBUG_AUDIO_TUNING_MODE ? 0.16 : 0.018, waveform: 'sine' }],
  },
};

const DEBUG_TEST_SOUND: SoundProfile = {
  masterGain: 0.3,
  steps: [{ frequency: 620, duration: 0.4, delay: 0, gain: 0.2, waveform: 'sine' }],
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
  const lastStep = profile.steps[profile.steps.length - 1];

  console.info('[Perio UI][Audio] scheduling', {
    audioContextState: audioContext.state,
    masterGain: profile.masterGain,
    steps: profile.steps.map((step) => ({
      frequency: step.frequency,
      gain: step.gain,
      durationMs: Math.round(step.duration * 1000),
      delayMs: Math.round(step.delay * 1000),
      waveform: step.waveform,
    })),
  });

  for (const step of profile.steps) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = step.waveform;
    oscillator.frequency.value = step.frequency;

    const filter = audioContext.createBiquadFilter();
    filter.type = step.frequency >= 1000 ? 'highpass' : 'lowpass';
    filter.frequency.value = step.frequency >= 1000 ? 900 : 1800;
    filter.Q.value = 0.8;

    const stepGain = audioContext.createGain();
    stepGain.gain.setValueAtTime(0.0005, now + step.delay);
    stepGain.gain.linearRampToValueAtTime(step.gain, now + step.delay + 0.02);
    stepGain.gain.exponentialRampToValueAtTime(0.0005, now + step.delay + step.duration);

    console.info('[Perio UI][Audio] oscillator setup', {
      frequency: step.frequency,
      oscillatorGain: step.gain,
      durationMs: Math.round(step.duration * 1000),
      masterGain: profile.masterGain,
    });

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
  }, Math.max(250, Math.round(((lastStep?.delay ?? 0) + (lastStep?.duration ?? 0.06)) * 1000) + 50));
}

async function playDebugTestSound(audioContextRef: React.MutableRefObject<AudioContext | null>) {
  const audioContext = await ensureAudioContext(audioContextRef, 'manual');

  if (!audioContext) {
    logAudioEvent('failure', { trigger: 'manual', reason: 'context-missing' });
    return false;
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  console.info('[Perio UI][Audio] playTestSound', {
    audioContextState: audioContext.state,
    masterGain: DEBUG_TEST_SOUND.masterGain,
    oscillatorGain: DEBUG_TEST_SOUND.steps[0]?.gain,
    durationMs: Math.round((DEBUG_TEST_SOUND.steps[0]?.duration ?? 0) * 1000),
  });

  scheduleSound(audioContext, DEBUG_TEST_SOUND);
  logAudioEvent('success', { sound: 'acknowledgment', trigger: 'manual', reason: 'playTestSound' });
  return true;
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

        const profile = SOUND_LIBRARY[sound];
        const toneSummary = profile.steps
          .map((step) => `f=${step.frequency}Hz d=${Math.round(step.duration * 1000)}ms g=${step.gain}`)
          .join(' | ');

        console.info(`[Perio UI][Audio] sound=${sound} trigger=${trigger} frequency=${toneSummary} masterGain=${profile.masterGain}`);
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
    playTestSound: () => playDebugTestSound(audioContextRef),
  };
}