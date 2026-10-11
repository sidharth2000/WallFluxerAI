import { useRef } from 'react'
import { Autocomplete, TextField } from '@mui/material'

type Preference = {
    id: number
    category: string
    name: string
}

type TagInputProps = {
    label: string
    hint: string
    placeholder: string
    options: Preference[]
    tags: string[]
    onChange: (tags: string[]) => void
    disabled?: boolean
    className?: string
}

const TAG_COLORS = [
    {
        bg: 'rgba(255,122,41,0.15)',
        text: '#ff9c5c',
        border: 'rgba(255,122,41,0.4)',
    },
    {
        bg: 'rgba(94,196,166,0.15)',
        text: '#7cd9bb',
        border: 'rgba(94,196,166,0.4)',
    },
    {
        bg: 'rgba(122,158,255,0.15)',
        text: '#9db4ff',
        border: 'rgba(122,158,255,0.4)',
    },
    {
        bg: 'rgba(230,122,255,0.15)',
        text: '#e29bff',
        border: 'rgba(230,122,255,0.4)',
    },
    {
        bg: 'rgba(255,209,102,0.15)',
        text: '#ffdd85',
        border: 'rgba(255,209,102,0.4)',
    },
    {
        bg: 'rgba(255,107,129,0.15)',
        text: '#ff93a8',
        border: 'rgba(255,107,129,0.4)',
    },
    {
        bg: 'rgba(110,231,183,0.15)',
        text: '#8ff0c4',
        border: 'rgba(110,231,183,0.4)',
    },
]

function colorForIndex(index: number) {
    return TAG_COLORS[index % TAG_COLORS.length]
}

export default function TagInput({
    label,
    hint,
    placeholder,
    options,
    tags,
    onChange,
    disabled = false,
    className = '',
}: TagInputProps) {

    const inputRef = useRef<HTMLInputElement>(null)

    const selectedOptions = options.filter(
        (option) => tags.includes(option.name)
    )

    return (
        <div className={`tag-input-container ${className}`}>

            <div className="tag-input-header">

                <span className="tag-input-label">
                    {label}
                </span>

                <span className="tag-input-count">
                    {tags.length === 0
                        ? 'None yet'
                        : `${tags.length} tag${tags.length > 1 ? 's' : ''}`}
                </span>

            </div>

            <p className="tag-input-hint">
                {hint}
            </p>

            <div className="tag-input-scroll">

                <Autocomplete<Preference, true, false, false>
                    multiple
                    fullWidth
                    disabled={disabled}
                    options={options}
                    value={selectedOptions}

                    onChange={(_, values, reason) => {
                        onChange(
                            values.map((value) => value.name)
                        )

                        if (reason === 'selectOption') {
                            inputRef.current?.blur()
                        }
                    }}

                    getOptionLabel={(option) => option.name}

                    isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                    }

                    renderValue={(value, getItemProps) =>
                        value.map((option, index) => {

                            const color = colorForIndex(index)

                            const {
                                key,
                                ...itemProps
                            } = getItemProps({
                                index,
                            })

                            return (
                                <span
                                    key={key}
                                    {...itemProps}
                                    className="tag-chip"
                                    style={{
                                        background: color.bg,
                                        color: color.text,
                                        borderColor: color.border,
                                    }}
                                >
                                    {option.name}

                                    <button
                                        type="button"
                                        className="tag-chip-remove"
                                        disabled={disabled}
                                        onClick={(event) => {
                                            event.stopPropagation()

                                            onChange(
                                                tags.filter(
                                                    (tag) =>
                                                        tag !== option.name
                                                )
                                            )
                                        }}
                                        aria-label={`Remove ${option.name}`}
                                    >
                                        ×
                                    </button>

                                </span>
                            )
                        })
                    }

                    renderInput={(params) => (
                        <TextField
                            {...params}
                            inputRef={inputRef}
                            placeholder={
                                tags.length === 0
                                    ? placeholder
                                    : 'Add more...'
                            }
                            variant="standard"
                        />
                    )}

                    slotProps={{
                        paper: {
                            sx: {
                                mt: 0.5,
                                background: 'var(--surface-raised)',
                                border: '1px solid var(--border-strong)',
                                borderRadius: 'var(--radius-sm)',
                                boxShadow: 'var(--shadow-card)',
                            },
                        },

                        listbox: {
                            sx: {
                                padding: '4px',
                                background: 'transparent',

                                '& .MuiAutocomplete-option': {
                                    fontSize: '0.85rem',
                                    color: 'var(--text)',
                                    borderRadius: 'var(--radius-sm)',
                                },

                                '& .MuiAutocomplete-option:hover': {
                                    background: 'var(--accent-soft)',
                                },

                                '& .MuiAutocomplete-option.Mui-focused': {
                                    background: 'var(--accent-soft)',
                                },

                                '& .MuiAutocomplete-option[aria-selected="true"]': {
                                    background: 'var(--accent-soft)',
                                    color: 'var(--accent)',
                                },
                            },
                        },
                    }}

                    sx={{
                        '& .MuiAutocomplete-inputRoot': {
                            padding: '0 !important',
                            flexWrap: 'wrap',
                        },

                        '& .MuiAutocomplete-input': {
                            padding: '6px 4px !important',
                            minWidth: '80px',
                            color: 'var(--text)',
                        },

                        '& .MuiAutocomplete-endAdornment': {
                            display: 'none',
                        },

                        '& .MuiInput-underline:before': {
                            display: 'none',
                        },

                        '& .MuiInput-underline:after': {
                            display: 'none',
                        },
                    }}
                />

            </div>

        </div>
    )
}