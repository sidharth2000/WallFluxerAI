import { useEffect, useRef, useState } from 'react'
import CasinoIcon from '@mui/icons-material/Casino'

export type PreferenceOption = {
    id: number
    category: string
    name: string
}

type PreferencePickerProps = {
    label: string
    hint: string
    options: PreferenceOption[]
    selected: PreferenceOption | null
    onChange: (option: PreferenceOption) => void
    disabled?: boolean
    className?: string
}

// how long the dice "roll" lasts, and how fast the highlight hops between chips
const ROLL_DURATION_MS = 700
const SHUFFLE_INTERVAL_MS = 85

export default function PreferencePicker({
    label,
    hint,
    options,
    selected,
    onChange,
    disabled = false,
    className = '',
}: PreferencePickerProps) {
    const activeChipRef = useRef<HTMLButtonElement | null>(null)

    const [rolling, setRolling] = useState(false)
    // chip that is currently highlighted while the dice is rolling
    const [shuffleId, setShuffleId] = useState<number | null>(null)

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearTimers = () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        intervalRef.current = null
        timeoutRef.current = null
    }

    // never leave timers running after unmount
    useEffect(() => clearTimers, [])

    // keep the active chip (selected, or the one being shuffled over) visible
    const activeId = shuffleId ?? selected?.id
    useEffect(() => {
        activeChipRef.current?.scrollIntoView({
            block: 'nearest',
            behavior: shuffleId !== null ? 'auto' : 'smooth',
        })
    }, [activeId, shuffleId])

    const handleRandom = () => {
        if (rolling || disabled || options.length === 0) return

        // avoid re-picking the current option when there is a choice
        const pool = options.length > 1 && selected
            ? options.filter((option) => option.id !== selected.id)
            : options

        const target = pool[Math.floor(Math.random() * pool.length)]

        setRolling(true)

        intervalRef.current = setInterval(() => {
            const hop = options[Math.floor(Math.random() * options.length)]
            setShuffleId(hop.id)
        }, SHUFFLE_INTERVAL_MS)

        timeoutRef.current = setTimeout(() => {
            clearTimers()
            setShuffleId(null)
            setRolling(false)
            onChange(target)
        }, ROLL_DURATION_MS)
    }

    return (
        <div className={`pref-picker ${className}`}>
            <div className="pref-picker-header">
                <span className="pref-picker-label">{label}</span>

                <button
                    type="button"
                    className={`pref-picker-random ${rolling ? 'rolling' : ''}`}
                    onClick={handleRandom}
                    disabled={disabled || options.length === 0}
                    title={`Pick a random ${label.toLowerCase()}`}
                    aria-label={`Pick a random ${label.toLowerCase()}`}
                    aria-busy={rolling}
                >
                    <CasinoIcon className="dice-icon" fontSize="small" />
                </button>
            </div>

            <p className="pref-picker-hint">{hint}</p>

            <div className="pref-picker-options" role="radiogroup" aria-label={label}>
                {options.length === 0 && (
                    <span className="pref-picker-empty">No options available.</span>
                )}

                {options.map((option) => {
                    const isSelected = selected?.id === option.id
                    const isShuffling = shuffleId === option.id
                    const isActive = shuffleId !== null ? isShuffling : isSelected

                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            ref={isActive ? activeChipRef : null}
                            className={[
                                'pref-chip',
                                isSelected && !rolling ? 'selected' : '',
                                isShuffling ? 'shuffling' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => {
                                if (!rolling) onChange(option)
                            }}
                        >
                            {option.name}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}