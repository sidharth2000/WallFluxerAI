import { Slider, Switch } from '@mui/material'
import TimerIcon from '@mui/icons-material/Timer'
import BoltIcon from '@mui/icons-material/Bolt'
import MemoryIcon from '@mui/icons-material/Memory'
import "./SchedulerPanel.css"

// Hard floor — protects the user's system from a runaway short interval.
export const MIN_INTERVAL_MINUTES = 1      // 1 hour
export const MAX_INTERVAL_MINUTES = 480     // 8 hours
export const MIN_IDLE_MINUTES = 1
export const MAX_IDLE_MINUTES = 30
export const MIN_IDLE_THRESHOLD = 1
export const MAX_IDLE_THRESHOLD = 40

export type SchedulerDraft = {
    intervalMinutes: number
    idleMinutes: number
    idleThreshold: number
    pluggedInOnly: boolean
}

export type SchedulerStatus = {
    id: string
    idle_streak_minutes: number
    config: {
        interval_minutes: number
        idle_minutes: number
        idle_threshold: number
        plugged_in_only: boolean
    }
}

function formatInterval(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

type Props = {
    active: boolean
    checking: boolean
    draft: SchedulerDraft
    onDraftChange: (next: Partial<SchedulerDraft>) => void
    status: SchedulerStatus | null
    starting: boolean
    stopping: boolean
    disabledReason?: string | null // e.g. form invalid — shown as a hint, doesn't block sliders
    onStart: () => void
    onStop: () => void
}

export default function SchedulerPanel({
    active,
    checking,
    draft,
    onDraftChange,
    status,
    starting,
    stopping,
    onStop,
}: Props) {
    if (checking) {
        return (
            <div className="scheduler-panel scheduler-panel-loading">
                <span className="preview-spinner" />
            </div>
        )
    }

    if (active && status) {
        const idleRequired = status.config.idle_minutes
        const idleStreak = status.idle_streak_minutes
        const idleMet = idleStreak >= idleRequired

        return (
            <div className="scheduler-panel scheduler-status-card">
                <div className="scheduler-status-header">
                    <span className="scheduler-status-title">
                        <TimerIcon fontSize="small" /> Wallpaper Scheduler
                    </span>
                    <span className="scheduler-status-badge">
                        <span className="scheduler-status-dot" /> SCHEDULER ACTIVE
                    </span>
                </div>
                <p className="scheduler-status-sub">
                    Your wallpapers are being generated automatically.
                </p>

                <div className="scheduler-stats">
                    <div className="scheduler-stat">
                        <span className="scheduler-stat-value">—</span>
                        <span className="scheduler-stat-label">Wallpapers Generated</span>
                    </div>
                    <div className="scheduler-stat">
                        <span className="scheduler-stat-value">—</span>
                        <span className="scheduler-stat-label">Next Generation</span>
                    </div>
                </div>

                <div className="scheduler-idle-row">
                    <span className={`scheduler-idle-dot ${idleMet ? 'met' : ''}`} />
                    <div>
                        <div className="scheduler-idle-title">
                            {idleMet ? 'Idle threshold met' : 'Waiting for GPU idle'}
                        </div>
                        <div className="scheduler-idle-desc">
                            GPU must stay idle for {idleRequired} min before generation
                            {' '}({idleStreak}/{idleRequired} so far).
                        </div>
                    </div>
                </div>

                <div className="scheduler-config-summary">
                    <div className="scheduler-config-row">
                        <BoltIcon fontSize="small" /> Power
                        <span>{status.config.plugged_in_only ? 'Plugged in only' : 'Any power source'}</span>
                    </div>
                    <div className="scheduler-config-row">
                        <TimerIcon fontSize="small" /> Interval
                        <span>Every {formatInterval(status.config.interval_minutes)}</span>
                    </div>
                    <div className="scheduler-config-row">
                        <MemoryIcon fontSize="small" /> GPU idle
                        <span>{idleRequired} min @ ≤{status.config.idle_threshold}%</span>
                    </div>
                </div>

                <div className="scheduler-status-footer">
                    <span className="scheduler-last-generated">Last generated: —</span>
                    <div className="scheduler-status-actions">
                        <button className="scheduler-btn ghost" disabled title="Coming soon">
                            View History
                        </button>
                        <button
                            className="scheduler-btn danger"
                            onClick={onStop}
                            disabled={stopping}
                        >
                            {stopping ? 'Stopping…' : 'Stop Scheduler'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ---- inactive: configuration form ----
    return (
        <div className="scheduler-panel">
            <div className="scheduler-panel-header">
                <TimerIcon fontSize="small" /> Scheduler settings
            </div>

            <div className="scheduler-field">
                <div className="scheduler-field-label">
                    <BoltIcon fontSize="small" />
                    Power
                    <span className="scheduler-field-value">
                        {draft.pluggedInOnly ? 'Plugged in only' : 'Any power source'}
                    </span>
                </div>
                <Switch
                    checked={draft.pluggedInOnly}
                    disabled={starting}
                    onChange={(e) => onDraftChange({ pluggedInOnly: e.target.checked })}
                />
            </div>

            <div className="scheduler-field">
                <div className="scheduler-field-label">
                    <TimerIcon fontSize="small" />
                    Interval
                    <span className="scheduler-field-value">Every {formatInterval(draft.intervalMinutes)}</span>
                </div>
                <Slider
                    value={draft.intervalMinutes}
                    min={MIN_INTERVAL_MINUTES}
                    max={MAX_INTERVAL_MINUTES}
                    step={30}
                    disabled={starting}
                    onChange={(_, v) => onDraftChange({ intervalMinutes: v as number })}
                />
            </div>

            <div className="scheduler-field">
                <div className="scheduler-field-label">
                    <MemoryIcon fontSize="small" />
                    GPU idle time
                    <span className="scheduler-field-value">{draft.idleMinutes} min</span>
                </div>
                <Slider
                    value={draft.idleMinutes}
                    min={MIN_IDLE_MINUTES}
                    max={MAX_IDLE_MINUTES}
                    step={1}
                    disabled={starting}
                    onChange={(_, v) => onDraftChange({ idleMinutes: v as number })}
                />
            </div>

            <div className="scheduler-field">
                <div className="scheduler-field-label">
                    <MemoryIcon fontSize="small" />
                    Idle threshold
                    <span className="scheduler-field-value">≤ {draft.idleThreshold}% GPU load</span>
                </div>
                <Slider
                    value={draft.idleThreshold}
                    min={MIN_IDLE_THRESHOLD}
                    max={MAX_IDLE_THRESHOLD}
                    step={1}
                    disabled={starting}
                    onChange={(_, v) => onDraftChange({ idleThreshold: v as number })}
                />
            </div>

            <p className="scheduler-hint">
                A new wallpaper generates automatically once your GPU has been idle
                long enough, without firing more often than the interval above.
            </p>
        </div>
    )
}