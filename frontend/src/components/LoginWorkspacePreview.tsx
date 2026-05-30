import React, { useState } from 'react';
import { Activity, Mic, Radio, Stethoscope } from 'lucide-react';

const PREVIEW_TEETH = [6, 7, 8, 9, 10, 11, 12, 13];

const MODULES = [
  {
    id: 'chart',
    label: 'Perio chart',
    title: '32-tooth clinical surface',
    detail: 'Live pocket depth, bleeding markers, and active site glow.',
    icon: Stethoscope,
  },
  {
    id: 'voice',
    label: 'Voice engine',
    title: 'Hands-free charting',
    detail: 'Parser maps spoken measurements to tooth, surface, and site.',
    icon: Mic,
  },
  {
    id: 'stream',
    label: 'Live stream',
    title: 'Deepgram transcription',
    detail: 'Websocket audio with command feedback and latency monitoring.',
    icon: Radio,
  },
] as const;

function MiniTooth({
  number,
  active,
  bleeding,
  onSelect,
}: {
  number: number;
  active: boolean;
  bleeding: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`auth-mini-tooth ${active ? 'auth-mini-tooth-active' : ''} ${bleeding ? 'auth-mini-tooth-bleed' : ''}`}
      aria-label={`Preview tooth ${number}`}
    >
      <span className="auth-mini-tooth-num">{number}</span>
      <span className="auth-mini-tooth-sites">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}

export function LoginWorkspacePreview() {
  const [activeTooth, setActiveTooth] = useState(9);
  const [activeModule, setActiveModule] = useState<(typeof MODULES)[number]['id']>('chart');
  const [voiceActive, setVoiceActive] = useState(false);

  const module = MODULES.find((item) => item.id === activeModule) ?? MODULES[0];
  const ModuleIcon = module.icon;

  return (
    <div className="auth-preview-inner auth-preview-compact">
      <div className="auth-preview-chart-col">
        <div className="auth-mini-arch">
          {PREVIEW_TEETH.map((tooth) => (
            <MiniTooth
              key={tooth}
              number={tooth}
              active={activeTooth === tooth}
              bleeding={tooth === 11}
              onSelect={() => setActiveTooth(tooth)}
            />
          ))}
        </div>
        <div className="auth-preview-readout">
          <div className="auth-preview-readout-block">
            <span className="auth-preview-readout-label">Active tooth</span>
            <strong>#{activeTooth}</strong>
          </div>
          <div className="auth-preview-readout-block">
            <span className="auth-preview-readout-label">Surface</span>
            <strong>Buccal</strong>
          </div>
          <div className="auth-preview-readout-block">
            <span className="auth-preview-readout-label">Site depth</span>
            <strong>{activeTooth === 11 ? '4 mm' : '3 mm'}</strong>
          </div>
        </div>
      </div>

      <div className="auth-preview-modules-col">
        <div className="auth-module-grid">
          {MODULES.map((item) => {
            const Icon = item.icon;
            const selected = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`auth-module-card ${selected ? 'auth-module-card-active' : ''}`}
                onClick={() => setActiveModule(item.id)}
              >
                <span className="auth-module-icon">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                <span className="auth-module-label">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="auth-module-detail-inline">
          <span className="auth-module-detail-icon">
            <ModuleIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="auth-module-detail-title">{module.title}</p>
            <p className="auth-module-detail-copy">{module.detail}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`auth-voice-demo auth-voice-demo-compact ${voiceActive ? 'auth-voice-demo-active' : ''}`}
        onMouseEnter={() => setVoiceActive(true)}
        onMouseLeave={() => setVoiceActive(false)}
        onFocus={() => setVoiceActive(true)}
        onBlur={() => setVoiceActive(false)}
        aria-label="Preview voice waveform"
      >
        <Mic className={`h-4 w-4 ${voiceActive ? 'mic-pulse' : ''}`} strokeWidth={2.2} />
        <div className="auth-voice-bars" aria-hidden>
          {Array.from({ length: 10 }).map((_, index) => (
            <span
              key={index}
              className="auth-voice-bar"
              style={{
                transform: voiceActive
                  ? `scaleY(${0.35 + ((index % 4) + 1) * 0.15})`
                  : 'scaleY(0.28)',
              }}
            />
          ))}
        </div>
        <span className="auth-voice-label">
          {voiceActive ? 'Listening — voice charting ready' : 'Hover to preview audio UI'}
        </span>
        <Activity className="auth-voice-activity h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
