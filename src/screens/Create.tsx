import { useEffect, useRef, useState } from 'react'
import "./Create.css"

import PreferencePicker from '../components/PreferencePicker'
import ImageModal from '../components/ImageModal'
import { getPreferences } from '../api/preferences'
import { getModels } from '../api/models'
import { applyWallpaper } from '../api/wallpaper'
import { Model } from '../types/Model'
import {
    instantGenerate as instantGenerateRequest,
    getJobStreamUrl,
} from '../api/generation'
import GenerationSettings, {
    DEFAULT_GENERATION_SETTINGS,
    GenerationSettingsValue,
    resolveResolution,
} from '../components/GenerationSettings'

import { getLocalImageUrl } from "../utils/localImage"

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import WallpaperIcon from '@mui/icons-material/Wallpaper'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { TextField } from '@mui/material'
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material"

type Preference = {
    id: number
    category: string
    name: string
}

type GenerationStage =
    | "optimizing_prompt"
    | "generating"
    | "refining"
    | "upscaling"
    | "done"
    | "error"

type GenerationEvent = {
    stage: GenerationStage
    progress: number
    message: string
    done?: boolean
    error?: string | null
    payload?: {
        image_path?: string
    }
}

type ApplyState = "idle" | "applying" | "success" | "error"

const MAX_CORE_IDEA_LENGTH = 300

// how long the Applied / Failed state stays on the button before resetting
const APPLY_FEEDBACK_MS = 2800

const DEFAULT_RATIO = 16 / 9

// stages shown in the stepper under the preview
const STAGE_STEPS: { id: GenerationStage; label: string }[] = [
    { id: "optimizing_prompt", label: "Prompt" },
    { id: "generating", label: "Draft" },
    { id: "refining", label: "Refine" },
    { id: "upscaling", label: "Upscale" },
]

const exampleIdeas = [
    "A lone astronaut standing on Mars...",
    "A rainy cyberpunk street at night...",
    "A peaceful Japanese garden in autumn...",
    "A futuristic city floating above the clouds...",
    "A vintage sports car driving along the coast...",
    "A mysterious castle surrounded by fog...",
    "A cozy cabin under a sky full of stars...",
    "A neon-lit gaming room overlooking the city...",
    "A giant spaceship above an alien planet...",
    "A cinematic mountain landscape at sunrise...",
]

/**
 * One image layer in the preview stack. It stays invisible (blurred and slightly
 * zoomed) until the file has actually loaded, then sharpens into place, so a new
 * pass never flashes an empty frame.
 */
function PreviewLayer({ src, alt, variant }: { src: string; alt: string; variant: string }) {
    const [loaded, setLoaded] = useState(false)
    const imgRef = useRef<HTMLImageElement | null>(null)

    // cached images can finish loading before onLoad is attached
    useEffect(() => {
        if (imgRef.current?.complete) setLoaded(true)
    }, [src])

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            className={`preview-layer preview-layer-${variant} ${loaded ? 'is-loaded' : ''}`}
        />
    )
}

export default function Create() {

    const [modelList, setModelList] = useState<Model[]>([])
    const [selectedModel, setSelectedModel] = useState<Model>()

    const [preferences, setPreferences] = useState<Preference[]>([])

    // single selection per category
    const [selectedStyle, setSelectedStyle] = useState<Preference | null>(null)
    const [selectedComposition, setSelectedComposition] = useState<Preference | null>(null)
    const [selectedTheme, setSelectedTheme] = useState<Preference | null>(null)

    const [coreIdea, setCoreIdea] = useState("")

    const [coreIdeaError, setCoreIdeaError] = useState(false)
    const [modelError, setModelError] = useState(false)
    const [styleError, setStyleError] = useState(false)
    const [compositionError, setCompositionError] = useState(false)
    const [themeError, setThemeError] = useState(false)

    const [genSettings, setGenSettings] = useState<GenerationSettingsValue>(DEFAULT_GENERATION_SETTINGS)
    const [resolutionError, setResolutionError] = useState(false)

    // ---- instant generate state ----
    const [isGenerating, setIsGenerating] = useState(false)
    const [genProgress, setGenProgress] = useState(0)
    const [genMessage, setGenMessage] = useState("")
    const [genStage, setGenStage] = useState<GenerationStage>("optimizing_prompt")
    const [genError, setGenError] = useState<string | null>(null)

    const [baseImage, setBaseImage] = useState<string | null>(null)
    const [hiresImage, setHiresImage] = useState<string | null>(null)
    const [finalImage, setFinalImage] = useState<string | null>(null)
    // raw server-side path for the final image, needed for the
    // "apply as wallpaper" call
    const [finalImagePath, setFinalImagePath] = useState<string | null>(null)

    // aspect ratio of the run that produced the current preview, so the frame
    // keeps matching the image even if the settings are changed afterwards
    const [lockedRatio, setLockedRatio] = useState<number | null>(null)

    const [isImageModalOpen, setIsImageModalOpen] = useState(false)

    const [applyState, setApplyState] = useState<ApplyState>("idle")
    const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const eventSourceRef = useRef<EventSource | null>(null)

    const [exampleIndex, setExampleIndex] = useState(0)
    const [animatedPlaceholder, setAnimatedPlaceholder] = useState("")
    const [placeholderActive, setPlaceholderActive] = useState(true)

    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const response = await getPreferences()
                setPreferences(response.data)
            } catch (error) {
                console.error("Failed to load preferences:", error)
            }
        }

        const loadModelList = async () => {
            try {
                const response = await getModels()
                setModelList(response.data["models"])
                setSelectedModel(response.data["models"][0])
            } catch (error) {
                console.error("Failed to load model list:", error)
            }
        }

        loadModelList()
        loadPreferences()
    }, [])

    // close any open SSE connection if the component unmounts mid-stream
    useEffect(() => {
        return () => {
            eventSourceRef.current?.close()
            if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
        }
    }, [])

    useEffect(() => {
        if (!placeholderActive || coreIdea || isGenerating) {
            return
        }

        const text: string = exampleIdeas[exampleIndex]

        let index = 0
        let deleting = false
        let timeoutId: ReturnType<typeof setTimeout>

        const animate = (): void => {
            if (!placeholderActive || coreIdea || isGenerating) {
                return
            }

            if (!deleting) {
                index++
                setAnimatedPlaceholder(text.slice(0, index))

                if (index === text.length) {
                    deleting = true
                    timeoutId = setTimeout(animate, 1800)
                } else {
                    timeoutId = setTimeout(animate, 45)
                }
            } else {
                index--
                setAnimatedPlaceholder(text.slice(0, index))

                if (index === 0) {
                    setExampleIndex((prev) => (prev + 1) % exampleIdeas.length)
                    timeoutId = setTimeout(animate, 400)
                } else {
                    timeoutId = setTimeout(animate, 25)
                }
            }
        }

        animate()

        return (): void => {
            clearTimeout(timeoutId)
        }
    }, [exampleIndex, placeholderActive, coreIdea, isGenerating])

    const styles = preferences.filter((preference) => preference.category === "STYLE")
    const compositions = preferences.filter((preference) => preference.category === "COMPOSITION")
    const themes = preferences.filter((preference) => preference.category === "THEME")

    // best available image to show "maximized" / to apply as wallpaper preview
    const displayedImage = finalImage || hiresImage || baseImage

    // preview frame ratio: follows the chosen resolution until a run starts,
    // then stays locked to that run
    const liveResolution = resolveResolution(genSettings)
    const liveRatio = liveResolution ? liveResolution.width / liveResolution.height : DEFAULT_RATIO
    const rawRatio = (isGenerating || displayedImage) && lockedRatio ? lockedRatio : liveRatio
    const frameRatio = Math.min(Math.max(rawRatio, 0.5), 3)

    const progressPct = Math.round(Math.min(Math.max(genProgress, 0), 100))
    const currentStageIndex = STAGE_STEPS.findIndex((step) => step.id === genStage)

    const handleGenerationEvent = (data: GenerationEvent) => {
        setGenProgress(data.progress)
        setGenMessage(data.message)
        setGenStage(data.stage)

        const imagePath = data.payload?.image_path
        if (imagePath) {
            const url = getLocalImageUrl(imagePath)

            if (data.stage === "generating") setBaseImage(url)
            if (data.stage === "refining") setHiresImage(url)
            if (data.stage === "done") {
                setFinalImage(url)
                setFinalImagePath(imagePath)
            }
        }

        if (data.stage === "error") {
            setGenError(data.error ?? "Something went wrong during generation.")
            setIsGenerating(false)
            eventSourceRef.current?.close()
            eventSourceRef.current = null
            return
        }

        if (data.done) {
            setIsGenerating(false)
            eventSourceRef.current?.close()
            eventSourceRef.current = null
        }
    }

    const subscribeToJob = (jobId: string) => {
        const es = new EventSource(getJobStreamUrl(jobId))
        eventSourceRef.current = es

        es.onmessage = (event) => {
            try {
                const data: GenerationEvent = JSON.parse(event.data)
                handleGenerationEvent(data)
            } catch (err) {
                console.error("Failed to parse SSE message:", err, event.data)
            }
        }

        es.onerror = (err) => {
            console.error("SSE connection error:", err)
            setGenError("Lost connection while generating. Please try again.")
            setIsGenerating(false)
            es.close()
            eventSourceRef.current = null
        }
    }

    const handleInstantGenerate = async () => {
        if (isGenerating) return

        const trimmedIdea = coreIdea.trim()

        const isIdeaValid = trimmedIdea.length > 0
        const isModelValid = !!selectedModel
        const isStyleValid = !!selectedStyle
        const isCompositionValid = !!selectedComposition
        const isThemeValid = !!selectedTheme
        const resolution = resolveResolution(genSettings)
        const isResolutionValid = !!resolution

        setCoreIdeaError(!isIdeaValid)
        setModelError(!isModelValid)
        setStyleError(!isStyleValid)
        setCompositionError(!isCompositionValid)
        setThemeError(!isThemeValid)
        setResolutionError(!isResolutionValid)

        if (!isIdeaValid || !isModelValid || !isStyleValid || !isCompositionValid || !isThemeValid || !isResolutionValid) {
            return
        }

        // the backend still accepts lists, so send a single-item list per category
        const payload = {
            core_idea: trimmedIdea,
            preference_style_ids: [selectedStyle!.id],
            preference_composition_ids: [selectedComposition!.id],
            preference_theme_ids: [selectedTheme!.id],
            model_id: selectedModel!.id,
            width: resolution!.width,
            height: resolution!.height,
            steps: genSettings.steps,
        }

        // reset previous run
        setBaseImage(null)
        setHiresImage(null)
        setFinalImage(null)
        setFinalImagePath(null)
        setIsImageModalOpen(false)
        setApplyState("idle")
        setGenError(null)
        setGenProgress(0)
        setGenStage("optimizing_prompt")
        setGenMessage("Starting...")
        setLockedRatio(resolution!.width / resolution!.height)
        setIsGenerating(true)

        try {
            const response = await instantGenerateRequest(payload)
            subscribeToJob(response.data.job_id)
        } catch (error) {
            console.error("Failed to start generation:", error)
            setGenError("Failed to start generation. Please try again.")
            setIsGenerating(false)
        }
    }

    const handleMaximize = () => {
        if (!displayedImage) return
        setIsImageModalOpen(true)
    }

    const handleApplyWallpaper = async () => {
        if (!finalImagePath || applyState === "applying") return

        if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
        setApplyState("applying")

        try {
            await applyWallpaper(finalImagePath)
            setApplyState("success")
        } catch (error) {
            console.error("Failed to apply wallpaper:", error)
            setApplyState("error")
        }

        // fall back to the normal button after a moment
        applyTimerRef.current = setTimeout(() => setApplyState("idle"), APPLY_FEEDBACK_MS)
    }

    const pickerClassName = (hasError: boolean) =>
        [hasError ? 'input-error' : '', isGenerating ? 'disabled' : ''].filter(Boolean).join(' ')

    const showCounter = !placeholderActive || coreIdea.length > 0

    return (
        <div className="create-screen">
            <div
                className={`model-select-container ${modelError ? 'input-error' : ''} ${isGenerating ? 'disabled' : ''}`}
            >
                <FormControl size="small" sx={{ minWidth: 180 }} disabled={isGenerating}>
                    <InputLabel
                        id="model-select-label"
                        sx={{
                            color: 'var(--text-muted)',
                            '&.Mui-focused': { color: 'var(--accent)' },
                        }}
                    >
                        Model
                    </InputLabel>

                    <Select
                        labelId="model-select-label"
                        label="Model"
                        value={selectedModel?.model_name ?? ""}
                        onFocus={() => {
                            if (modelError) setModelError(false)
                        }}
                        onChange={(e) => {
                            const model = modelList.find(
                                (model) => model.model_name === e.target.value
                            )
                            if (model) setSelectedModel(model)
                        }}
                        sx={{
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--border)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--accent)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--accent)',
                                borderWidth: '1px',
                                boxShadow: 'var(--shadow-focus)',
                            },
                            '& .MuiSvgIcon-root': {
                                color: 'var(--text-muted)',
                            },
                            '& .MuiSelect-select': {
                                padding: '10px 12px',
                            },
                        }}
                        MenuProps={{
                            slotProps: {
                                paper: {
                                    sx: {
                                        mt: 0.5,
                                        background: 'var(--surface-raised)',
                                        border: '1px solid var(--border-strong)',
                                        borderRadius: 'var(--radius-sm)',
                                        boxShadow: 'var(--shadow-card)',
                                        '& .MuiMenuItem-root': {
                                            fontSize: '0.85rem',
                                            color: 'var(--text)',
                                        },
                                        '& .MuiMenuItem-root:hover': {
                                            background: 'var(--accent-soft)',
                                        },
                                        '& .MuiMenuItem-root.Mui-selected': {
                                            background: 'var(--accent-soft)',
                                        },
                                        '& .MuiMenuItem-root.Mui-selected:hover': {
                                            background: 'var(--accent-soft)',
                                        },
                                    },
                                },
                            },
                        }}
                    >
                        {modelList.map((model) => (
                            <MenuItem key={model.model_name} value={model.model_name}>
                                {model.model_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>

            {/* ---------------- Idea box with the generate button built in ---------------- */}
            <div className="core-idea-container">
                <div
                    className={`core-idea ${coreIdeaError ? "input-error" : ""} ${isGenerating ? "disabled" : ""}`}
                >
                    <div className="core-idea-input">
                        <TextField
                            multiline
                            fullWidth
                            variant="standard"
                            value={coreIdea}
                            disabled={isGenerating}
                            placeholder={
                                placeholderActive && !coreIdea
                                    ? animatedPlaceholder
                                    : "Describe the wallpaper you want..."
                            }
                            onFocus={(): void => {
                                setPlaceholderActive(false)
                                if (coreIdeaError) setCoreIdeaError(false)
                            }}
                            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
                                const value = e.target.value
                                if (value.length <= MAX_CORE_IDEA_LENGTH) {
                                    setCoreIdea(value)
                                }
                            }}
                            onKeyDown={(e: React.KeyboardEvent): void => {
                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault()
                                    handleInstantGenerate()
                                }
                            }}
                            slotProps={{
                                input: {
                                    disableUnderline: true,
                                },
                            }}
                            sx={{
                                height: "100%",
                                "& .MuiInputBase-root": {
                                    height: "100%",
                                    alignItems: "flex-start",
                                    color: "var(--text)",
                                    fontSize: "1rem",
                                    padding: 0,
                                },
                                "& textarea": {
                                    height: "100% !important",
                                    overflow: "auto !important",
                                    padding: "0 !important",
                                    boxSizing: "border-box",
                                },
                                "& textarea::placeholder": {
                                    color: "var(--text)",
                                    opacity: 0.45,
                                },
                            }}
                        />
                    </div>

                    <div className="core-idea-footer">
                        <div className="core-idea-footer-info">
                            {coreIdeaError ? (
                                <span className="core-idea-error-text">
                                    Describe your wallpaper idea first.
                                </span>
                            ) : (
                                <span className="core-idea-counter">
                                    {showCounter
                                        ? `${coreIdea.length} / ${MAX_CORE_IDEA_LENGTH}`
                                        : "Ctrl + Enter to generate"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    className={`generate-btn ${isGenerating ? 'busy' : ''}`}
                    onClick={handleInstantGenerate}
                    disabled={isGenerating}
                    title="Generate wallpaper (Ctrl + Enter)"
                >
                    <span className="generate-btn-icon">
                        {isGenerating ? <span className="btn-spinner" /> : <AutoAwesomeIcon />}
                    </span>
                    <span className="generate-btn-text">
                        <strong>{isGenerating ? "Generating" : "Generate"}</strong>
                        <span>{isGenerating ? "Hang tight..." : "Wallpaper"}</span>
                    </span>
                </button>
            </div>

            <div className="preferences-container">
                <PreferencePicker
                    label="Style"
                    hint="How should the image look?"
                    options={styles}
                    selected={selectedStyle}
                    disabled={isGenerating}
                    className={pickerClassName(styleError)}
                    onChange={(option) => {
                        setSelectedStyle(option)
                        setStyleError(false)
                    }}
                />

                <PreferencePicker
                    label="Theme"
                    hint="What kind of world or aesthetic should it have?"
                    options={themes}
                    selected={selectedTheme}
                    disabled={isGenerating}
                    className={pickerClassName(themeError)}
                    onChange={(option) => {
                        setSelectedTheme(option)
                        setThemeError(false)
                    }}
                />

                <PreferencePicker
                    label="Composition"
                    hint="How should the scene be framed?"
                    options={compositions}
                    selected={selectedComposition}
                    disabled={isGenerating}
                    className={pickerClassName(compositionError)}
                    onChange={(option) => {
                        setSelectedComposition(option)
                        setCompositionError(false)
                    }}
                />
            </div>

            <div className="final-setting-container">
                <GenerationSettings
                    value={genSettings}
                    onChange={(next) => {
                        setGenSettings(next)
                        setResolutionError(false)
                    }}
                    disabled={isGenerating}
                    showError={resolutionError}
                />

                <div className="preview-container">
                    <div className="preview-stage">
                        <div
                            className={[
                                'preview-images',
                                displayedImage ? 'clickable' : '',
                                isGenerating ? 'is-generating' : '',
                            ].filter(Boolean).join(' ')}
                            style={{ '--ratio': frameRatio } as React.CSSProperties}
                            onClick={handleMaximize}
                        >
                            {/* ---- empty / error states ---- */}
                            {!displayedImage && !genError && !isGenerating && (
                                <div className="preview-empty">
                                    <span className="preview-empty-icon">
                                        <ImageOutlinedIcon />
                                    </span>
                                    <span>Your wallpaper will appear here.</span>
                                </div>
                            )}

                            {genError && <div className="preview-error">{genError}</div>}

                            {/* ---- image layers: each pass fades in over the previous one ---- */}
                            {baseImage && (
                                <PreviewLayer key={baseImage} src={baseImage} alt="Draft pass" variant="base" />
                            )}

                            {hiresImage && (
                                <PreviewLayer key={hiresImage} src={hiresImage} alt="Refined pass" variant="hires" />
                            )}

                            {finalImage && (
                                <PreviewLayer key={finalImage} src={finalImage} alt="Final wallpaper" variant="final" />
                            )}

                            {finalImage && !isGenerating && (
                                <div key={`flash-${finalImage}`} className="preview-flash" />
                            )}

                            {/* ---- loader while nothing has rendered yet ---- */}
                            {isGenerating && !displayedImage && !genError && (
                                <div className="preview-loader">
                                    <div className="loader-aurora">
                                        <span className="blob blob-1" />
                                        <span className="blob blob-2" />
                                        <span className="blob blob-3" />
                                    </div>
                                    <div className="loader-sheen" />

                                    <div className="loader-core">
                                        <div className="loader-ring">
                                            <svg viewBox="0 0 120 120" aria-hidden="true">
                                                <circle className="ring-orbit" cx="60" cy="60" r="56" />
                                                <circle className="ring-track" cx="60" cy="60" r="46" />
                                                <circle
                                                    className="ring-fill"
                                                    cx="60"
                                                    cy="60"
                                                    r="46"
                                                    transform="rotate(-90 60 60)"
                                                    strokeDasharray="289.03"
                                                    strokeDashoffset={289.03 * (1 - progressPct / 100)}
                                                />
                                            </svg>
                                            <div className="loader-percent">
                                                {progressPct}
                                                <small>%</small>
                                            </div>
                                        </div>
                                        <div className="loader-message">{genMessage || "Starting..."}</div>
                                    </div>
                                </div>
                            )}

                            {/* ---- live chrome while an image is already showing ---- */}
                            {isGenerating && displayedImage && (
                                <div className="preview-overlay">
                                    <div className="overlay-vignette" />
                                    <div className="overlay-sheen" />
                                    <div className="scan-line" />
                                    <div className="overlay-pill">
                                        <span className="pill-dot" />
                                        <span className="pill-text">{genMessage || "Working..."}</span>
                                        <span className="pill-pct">{progressPct}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="preview-below">
                        {isGenerating ? (
                            <div className="preview-progress">
                                <div className="stage-steps">
                                    {STAGE_STEPS.map((step, i) => (
                                        <span
                                            key={step.id}
                                            className={[
                                                'stage-step',
                                                i < currentStageIndex ? 'done' : '',
                                                i === currentStageIndex ? 'active' : '',
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <span className="stage-dot" />
                                            {step.label}
                                        </span>
                                    ))}
                                </div>
                                <div className="preview-status-bar">
                                    <div
                                        className="preview-status-bar-fill"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="preview-controls">
                                <button
                                    className="preview-btn maximize-btn"
                                    disabled={!displayedImage}
                                    onClick={handleMaximize}
                                >
                                    <OpenInFullIcon fontSize="small" />
                                    Maximize
                                </button>

                                <button
                                    className={`preview-btn apply-btn ${applyState}`}
                                    disabled={!finalImagePath}
                                    aria-busy={applyState === "applying"}
                                    onClick={handleApplyWallpaper}
                                >
                                    <span key={applyState} className="apply-content">
                                        <span className="apply-icon">
                                            {applyState === "applying" && <span className="btn-spinner" />}
                                            {applyState === "success" && <CheckRoundedIcon fontSize="small" />}
                                            {applyState === "error" && <ErrorOutlineRoundedIcon fontSize="small" />}
                                            {applyState === "idle" && <WallpaperIcon fontSize="small" />}
                                        </span>
                                        {applyState === "applying" && "Applying..."}
                                        {applyState === "success" && "Wallpaper applied"}
                                        {applyState === "error" && "Failed, tap to retry"}
                                        {applyState === "idle" && "Apply as wallpaper"}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isImageModalOpen && displayedImage && (
                <ImageModal src={displayedImage} onClose={() => setIsImageModalOpen(false)} />
            )}
        </div>
    )
}