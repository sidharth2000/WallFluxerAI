import { Slider, Tooltip } from '@mui/material'
import HdIcon from '@mui/icons-material/Hd'
import HighQualityIcon from '@mui/icons-material/HighQuality'
import FourKIcon from '@mui/icons-material/FourK'
import TuneIcon from '@mui/icons-material/Tune'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { ReactElement } from 'react'

export type ResolutionPreset = 'HD' | 'FHD' | '4K' | 'CUSTOM'

export type GenerationSettingsValue = {
    preset: ResolutionPreset
    customWidth: string
    customHeight: string
    steps: number
}

export const MIN_DIMENSION = 512
export const MAX_DIMENSION = 7680
export const MIN_STEPS = 10
export const MAX_STEPS = 50
export const DEFAULT_STEPS = 20

export const DEFAULT_GENERATION_SETTINGS: GenerationSettingsValue = {
    preset: 'FHD',
    customWidth: '',
    customHeight: '',
    steps: DEFAULT_STEPS,
}

type PresetDef = {
    id: ResolutionPreset
    label: string
    sub: string
    width?: number
    height?: number
    icon: ReactElement
}

const PRESETS: PresetDef[] = [
    { id: 'HD', label: 'HD', sub: '1280 × 720', width: 1280, height: 720, icon: <HdIcon /> },
    { id: 'FHD', label: 'FHD', sub: '1920 × 1080', width: 1920, height: 1080, icon: <HighQualityIcon /> },
    { id: '4K', label: '4K', sub: '3840 × 2160', width: 3840, height: 2160, icon: <FourKIcon /> },
    { id: 'CUSTOM', label: 'Custom', sub: 'Your own size', icon: <TuneIcon /> },
]

/** Returns the final width/height to send to the API, or null if the custom size is invalid. */
export function resolveResolution(value: GenerationSettingsValue): { width: number; height: number } | null {
    if (value.preset !== 'CUSTOM') {
        const p = PRESETS.find((p) => p.id === value.preset)!
        return { width: p.width!, height: p.height! }
    }
    const width = parseInt(value.customWidth, 10)
    const height = parseInt(value.customHeight, 10)
    const ok = (n: number) => Number.isInteger(n) && n >= MIN_DIMENSION && n <= MAX_DIMENSION
    if (!ok(width) || !ok(height)) return null
    return { width, height }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const stepsLabel = (steps: number) => {
    if (steps <= 15) return 'Fast: quicker, rougher detail'
    if (steps <= 30) return 'Balanced: good detail for most images'
    return 'Quality: slower, finest detail'
}

type Props = {
    value: GenerationSettingsValue
    onChange: (value: GenerationSettingsValue) => void
    disabled?: boolean
    showError?: boolean
}

export default function GenerationSettings({ value, onChange, disabled, showError }: Props) {
    const resolved = resolveResolution(value)
    const customInvalid = value.preset === 'CUSTOM' && !resolved

    const ratio = resolved
        ? `${resolved.width / gcd(resolved.width, resolved.height)}:${resolved.height / gcd(resolved.width, resolved.height)}`
        : null

    return (
        <div className={`side-panel-container gen-settings ${disabled ? 'disabled' : ''}`}>
            {/* ---------------- Resolution ---------------- */}
            <section className="gen-section">
                <div className="gen-section-header">
                    <span className="gen-section-title">Resolution</span>
                    {resolved && (
                        <span className="gen-section-meta">
                            {resolved.width} × {resolved.height} ({ratio})
                        </span>
                    )}
                </div>

                <div className="res-tiles" role="radiogroup" aria-label="Resolution">
                    {PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={value.preset === p.id}
                            title={p.sub}
                            className={`res-tile ${value.preset === p.id ? 'selected' : ''}`}
                            onClick={() => onChange({ ...value, preset: p.id })}
                        >
                            {p.icon}
                            <span className="res-tile-label">{p.label}</span>
                        </button>
                    ))}
                </div>

                {value.preset === 'CUSTOM' && (
                    <>
                        <div className="custom-res">
                            <input
                                className={`custom-res-input ${showError && customInvalid ? 'input-error' : ''}`}
                                inputMode="numeric"
                                placeholder="Width"
                                value={value.customWidth}
                                onChange={(e) =>
                                    onChange({ ...value, customWidth: e.target.value.replace(/\D/g, '') })
                                }
                            />
                            <span className="custom-res-x">×</span>
                            <input
                                className={`custom-res-input ${showError && customInvalid ? 'input-error' : ''}`}
                                inputMode="numeric"
                                placeholder="Height"
                                value={value.customHeight}
                                onChange={(e) =>
                                    onChange({ ...value, customHeight: e.target.value.replace(/\D/g, '') })
                                }
                            />
                            <span className="custom-res-unit">px</span>
                        </div>
                        {showError && customInvalid && (
                            <span className="gen-error-text">
                                Use a width and height between {MIN_DIMENSION} and {MAX_DIMENSION} px.
                            </span>
                        )}
                    </>
                )}
            </section>

            {/* ---------------- Sampling steps ---------------- */}
            <section className="gen-section">
                <div className="gen-section-header">
                    <span className="gen-section-title">
                        Sampling steps
                        <Tooltip
                            arrow
                            placement="top"
                            slotProps={{
                                tooltip: {
                                    sx: {
                                        background: 'var(--surface-raised)',
                                        color: 'var(--text)',
                                        border: '1px solid var(--border-strong)',
                                        boxShadow: 'var(--shadow-card)',
                                        padding: '8px 10px',
                                    },
                                },
                                arrow: { sx: { color: 'var(--surface-raised)' } },
                            }}
                            title={
                                <div className="gen-tooltip">
                                    <div>Each step cleans the image up a little more.</div>
                                    <div>More steps give finer detail but take longer.</div>
                                    <div>20 to 30 is the sweet spot for wallpapers.</div>
                                </div>
                            }
                        >
                            <InfoOutlinedIcon className="gen-info-icon" sx={{ fontSize: 16 }} />
                        </Tooltip>
                    </span>
                    <span className="gen-section-meta">{value.steps} steps</span>
                </div>

                <div className="gen-slider">
                    <Slider
                        size="small"
                        value={value.steps}
                        min={MIN_STEPS}
                        max={MAX_STEPS}
                        step={1}
                        valueLabelDisplay="off"
                        onChange={(_, v) => onChange({ ...value, steps: v as number })}
                        sx={{
                            color: 'var(--accent)',
                            padding: '10px 0',
                            '& .MuiSlider-rail': { background: 'var(--border-strong)', opacity: 1 },
                        }}
                    />
                </div>
                <span className="gen-hint">{stepsLabel(value.steps)}</span>
            </section>
        </div>
    )
}