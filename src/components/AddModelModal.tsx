import { useState, useRef, useEffect, KeyboardEvent, ReactNode } from "react"
import { createPortal } from "react-dom"
import { Modal } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import "./AddModelModal.css"
import { addModel } from "../api/models"
import { subscribeToJob, JobEventPayload } from "../api/jobs"
import { tagColorIndex } from "../utils/tagColors"

interface AddModelModalProps {
    open: boolean
    handleClose: () => void
    onModelAdded?: () => void
}

const STAGE_LABELS: Record<string, string> = {
    loading_model: "Registering model",
    generating_thumbnail: "Generating thumbnail",
    complete: "Done",
    error: "Failed",
}

const MODEL_NAME_MAX_LENGTH = 60
const DESCRIPTION_MAX_LENGTH = 200

const TOOLTIP_WIDTH = 320
const TOOLTIP_MARGIN = 16

// Info icon whose popup is portaled to <body> (so it's never clipped by
// the modal's overflow) and toggles open on click (so moving the mouse
// toward it to click a link never causes it to close mid-move)
function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const anchorRef = useRef<HTMLSpanElement>(null)
    const boxRef = useRef<HTMLDivElement>(null)

    function toggle() {
        if (open) {
            setOpen(false)
            return
        }

        const rect = anchorRef.current?.getBoundingClientRect()
        if (!rect) return

        const left = Math.min(
            rect.right + 10,
            window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN
        )
        const top = Math.min(
            Math.max(rect.top + rect.height / 2, TOOLTIP_MARGIN),
            window.innerHeight - TOOLTIP_MARGIN
        )

        setPos({ top, left })
        setOpen(true)
    }

    // Close on click outside, or Escape
    useEffect(() => {
        if (!open) return

        function handlePointerDown(e: MouseEvent) {
            const target = e.target as Node
            if (anchorRef.current?.contains(target)) return
            if (boxRef.current?.contains(target)) return
            setOpen(false)
        }

        function handleKeyDown(e: globalThis.KeyboardEvent) {
            if (e.key === "Escape") setOpen(false)
        }

        document.addEventListener("mousedown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("mousedown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    return (
        <span
            ref={anchorRef}
            className="info-tooltip"
            tabIndex={0}
            role="button"
            aria-expanded={open}
            aria-label={label}
            onClick={toggle}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    toggle()
                }
            }}
        >
            <InfoOutlinedIcon fontSize="inherit" />
            {open &&
                createPortal(
                    <div
                        ref={boxRef}
                        className="info-tooltip-box"
                        style={{ top: pos.top, left: pos.left }}
                    >
                        {children}
                    </div>,
                    document.body
                )}
        </span>
    )
}

export default function AddModelModal({ open, handleClose, onModelAdded }: AddModelModalProps) {
    const [modelName, setModelName] = useState("")
    const [modelPath, setModelPath] = useState("")
    const [description, setDescription] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [jobStage, setJobStage] = useState<string | null>(null)

    const unsubscribeRef = useRef<(() => void) | null>(null)

    function resetForm() {
        setModelName("")
        setModelPath("")
        setDescription("")
        setTags([])
        setTagInput("")
        setError(null)
        setJobStage(null)
    }

    function handleModalClose() {
        // locked while a job is in flight — mirrors the Cancel button below
        if (isSubmitting) return
        resetForm()
        handleClose()
    }

    async function handleBrowseFile() {
        try {
            const selectedPath = await window.ipcRenderer.invoke('select-model-file')
            if (selectedPath) {
                setModelPath(selectedPath)
            }
        } catch (err) {
            console.error("File select failed:", err)
        }
    }

    function addTag(raw: string) {
        const value = raw.trim()
        if (!value) return
        if (tags.includes(value)) return
        setTags((prev) => [...prev, value])
        setTagInput("")
    }

    function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag(tagInput)
        } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
            setTags((prev) => prev.slice(0, -1))
        }
    }

    function removeTag(tag: string) {
        setTags((prev) => prev.filter((t) => t !== tag))
    }

    const isValid = modelName.trim() !== "" && modelPath.trim() !== ""

    async function handleSubmit() {
        if (!isValid || isSubmitting) return

        setIsSubmitting(true)
        setError(null)
        setJobStage(null)

        try {
            const { data: { job_id } } = await addModel({
                model_name: modelName.trim(),
                model_path: modelPath.trim(),
                model_description: description.trim(),
                model_tags: tags,
            })

            unsubscribeRef.current = subscribeToJob(job_id, {
                onEvent: (event: JobEventPayload) => {
                    setJobStage(event.stage)

                    if (!event.done) return

                    if (event.error || event.stage === "error") {
                        setError(event.error || "Failed to add model")
                        setIsSubmitting(false)
                        return
                    }

                    onModelAdded?.()
                    resetForm()
                    setIsSubmitting(false)
                    handleClose()
                },
                onError: () => {
                    setError("Lost connection while adding model")
                    setIsSubmitting(false)
                },
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add model")
            setIsSubmitting(false)
        }
    }

    return (
        <Modal open={open} onClose={handleModalClose}>
            <div className="add-model-modal">

                <div className="add-model-modal-header">
                    <span className="add-model-modal-title">Add Model</span>
                    <button
                        className="add-model-modal-close"
                        onClick={handleModalClose}
                        disabled={isSubmitting}
                        aria-label="Close"
                    >
                        <CloseIcon fontSize="small" />
                    </button>
                </div>

                <div className="add-model-modal-body">

                    <fieldset className="add-model-fieldset" disabled={isSubmitting}>

                        <div className="field">
                            <div className="field-label-row">
                                <label className="field-label">Model Name</label>
                                <span className="field-counter">
                                    {modelName.length}/{MODEL_NAME_MAX_LENGTH}
                                </span>
                            </div>
                            <input
                                type="text"
                                className="field-input"
                                placeholder="Enter your model name"
                                value={modelName}
                                maxLength={MODEL_NAME_MAX_LENGTH}
                                onChange={(e) => setModelName(e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <div className="field-label-row">
                                <label className="field-label">Model File</label>

                                <InfoTooltip label="Which models work here?">
                                    <p className="info-tooltip-title">Choosing a model</p>
                                    <p>
                                        Wallpapers are generated with a <strong>Stable Diffusion 1.5</strong> base
                                        model, then enhanced with hi-res fix and upscaling — so the base model
                                        you pick has a big impact on final quality and style.
                                    </p>
                                    <p>
                                        The default model is a generic SD 1.5 checkpoint. For noticeably better
                                        results, swap in a <strong>style-focused checkpoint</strong> — e.g. an
                                        anime-style model — matched to the look you want.
                                    </p>
                                    <p>
                                        The file must be in <strong>.safetensors</strong> format. You can find SD 1.5
                                        checkpoints on{" "}
                                        <a href="https://huggingface.co/models?other=stable-diffusion" target="_blank" rel="noopener noreferrer">
                                            Hugging Face
                                        </a>{" "}
                                        or{" "}
                                        <a href="https://civitai.com/models" target="_blank" rel="noopener noreferrer">
                                            Civitai
                                        </a>{" "}
                                        — check the base model is "SD 1.5" and pick a file size that fits your GPU's VRAM.
                                    </p>
                                </InfoTooltip>
                            </div>

                            <div className="model-file-picker">
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder="No file selected"
                                    value={modelPath}
                                    readOnly
                                />
                                <button
                                    type="button"
                                    className="browse-button"
                                    onClick={handleBrowseFile}
                                >
                                    <FolderOpenIcon fontSize="small" />
                                    Browse
                                </button>
                            </div>
                            <span className="field-hint">.safetensors files only</span>
                        </div>

                        <div className="field">
                            <div className="field-label-row">
                                <label className="field-label">Description</label>
                                <span className="field-counter">
                                    {description.length}/{DESCRIPTION_MAX_LENGTH}
                                </span>
                            </div>
                            <textarea
                                className="field-input field-textarea"
                                placeholder="Briefly describe this model..."
                                rows={3}
                                value={description}
                                maxLength={DESCRIPTION_MAX_LENGTH}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <label className="field-label">Tags</label>
                            <div className="tag-input-wrapper">
                                {tags.map((tag) => (
                                    <span key={tag} className={`tag-chip tag-chip-${tagColorIndex(tag)}`}>
                                        {tag}
                                        <button
                                            type="button"
                                            className="tag-chip-remove"
                                            onClick={() => removeTag(tag)}
                                            aria-label={`Remove ${tag}`}
                                        >
                                            <CloseIcon style={{ fontSize: 12 }} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    className="tag-input"
                                    placeholder={tags.length === 0 ? "Add tags..." : ""}
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={() => addTag(tagInput)}
                                />
                            </div>
                            <span className="field-hint">Press Enter or comma to add a tag</span>
                        </div>

                    </fieldset>

                    {error && <div className="add-model-modal-error">{error}</div>}

                </div>

                <div className="add-model-modal-actions">
                    <button
                        className="modal-button modal-button-secondary"
                        onClick={handleModalClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        className="modal-button modal-button-primary"
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                    >
                        {isSubmitting && <span className="button-spinner" />}
                        <span>
                            {isSubmitting
                                ? STAGE_LABELS[jobStage ?? ""] ?? "Adding..."
                                : "Add Model"}
                        </span>
                    </button>
                </div>

            </div>
        </Modal>
    )
}