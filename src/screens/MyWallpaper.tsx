import { useCallback, useEffect, useState } from "react"
import {
    Schedule,
    CalendarMonth,
    Style,
    Landscape,
    Palette,
    Wallpaper as WallpaperIcon,
    Delete,
    SmartToy,
    Check,
    Close,
} from "@mui/icons-material"

import ImageModal from "../components/ImageModal"
import { getLocalImageUrl } from "../utils/localImage" // adjust to your project's actual path
import {
    getWallpapers,
    applyWallpaper,
    deleteWallpaper, // add this to api/wallpaper.ts, same pattern as applyWallpaper (e.g. DELETE /wallpapers/:id)
} from "../api/wallpaper" // adjust to your project's actual path
import "./MyWallpaper.css"

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

type Wallpaper = {
    id: number
    image_path: string
    style: string
    theme: string
    composition: string
    model_name: string
    generation_time_seconds: number
    generated_on: string
}

// -----------------------------------------------------------------
// Constants
// -----------------------------------------------------------------

// The backend starts up alongside the UI, so a failed request almost
// always means the backend isn't up yet / died rather than a normal
// network hiccup. Point the user at the fix that actually works.
const RESTART_MESSAGE =
    "Something went wrong loading wallpapers. Please close and restart the app."
const RESTART_MESSAGE_SHORT =
    "Something went wrong — please close and restart the app."

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

function formatDate(iso: string): string {
    const date = new Date(iso)

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`
    }

    const minutes = Math.floor(seconds / 60)
    const remaining = Math.round(seconds % 60)

    return `${minutes}m ${remaining}s`
}

// -----------------------------------------------------------------
// Component
// -----------------------------------------------------------------

export default function MyWallpaper() {
    const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [activeImage, setActiveImage] = useState<Wallpaper | null>(null)
    const [applyingId, setApplyingId] = useState<number | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    // Delete flow (inline confirm on the card, same pattern as ModelCard)
    const [confirmingId, setConfirmingId] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [deleteErrorId, setDeleteErrorId] = useState<number | null>(null)

    useEffect(() => {
        if (!toast) return

        const timer = setTimeout(() => setToast(null), 2600)
        return () => clearTimeout(timer)
    }, [toast])

    const fetchWallpapers = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await getWallpapers()
            const data: Wallpaper[] = response.data

            setWallpapers(
                [...data].sort(
                    (a, b) =>
                        new Date(b.generated_on).getTime() -
                        new Date(a.generated_on).getTime()
                )
            )
        } catch {
            // Backend runs alongside the UI, so a failure here is almost
            // always "the backend isn't up" rather than a real network
            // error — tell the user how to actually fix it.
            setError(RESTART_MESSAGE)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchWallpapers()
    }, [fetchWallpapers])

    async function handleApply(wallpaper: Wallpaper, event: React.MouseEvent) {
        event.stopPropagation()

        if (applyingId !== null) return

        setApplyingId(wallpaper.id)

        try {
            await applyWallpaper(wallpaper.image_path)
            setToast("Wallpaper applied")
        } catch {
            setToast(RESTART_MESSAGE_SHORT)
        } finally {
            setApplyingId(null)
        }
    }

    function handleRequestDelete(wallpaper: Wallpaper, event: React.MouseEvent) {
        event.stopPropagation()
        setDeleteErrorId(null)
        setConfirmingId(wallpaper.id)
    }

    function handleCancelDelete(event: React.MouseEvent) {
        event.stopPropagation()
        setConfirmingId(null)
    }

    async function handleConfirmDelete(
        wallpaper: Wallpaper,
        event: React.MouseEvent
    ) {
        event.stopPropagation()

        if (deletingId !== null) return

        setDeletingId(wallpaper.id)
        setDeleteErrorId(null)

        try {
            await deleteWallpaper(wallpaper.id)

            // Drop it locally; avoids the skeleton flash a full refetch
            // (which toggles isLoading) would cause.
            setWallpapers((prev) => prev.filter((w) => w.id !== wallpaper.id))
            setConfirmingId(null)
            setToast("Wallpaper deleted")
        } catch (err) {
            console.error("Failed to delete wallpaper:", err)
            setDeleteErrorId(wallpaper.id)
            setConfirmingId(null)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="wallpaper-page">
            <header className="wallpaper-header">
                <h1>My Generations</h1>
                <div className="wallpaper-header-meta">
                    <span className="wallpaper-count-badge">
                        <WallpaperIcon fontSize="inherit" />
                        {isLoading
                            ? "Loading…"
                            : `${wallpapers.length} wallpaper${
                                  wallpapers.length === 1 ? "" : "s"
                              }`}
                    </span>
                    <span className="wallpaper-header-sub">
                        Everything you've rendered, ready to set as your desktop.
                    </span>
                </div>
            </header>

            {error && <div className="wallpaper-error">{error}</div>}

            {isLoading && !error && (
                <div className="wallpaper-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="wallpaper-card skeleton" />
                    ))}
                </div>
            )}

            {!isLoading && !error && wallpapers.length === 0 && (
                <div className="wallpaper-empty">No wallpapers generated yet.</div>
            )}

            {!isLoading && !error && wallpapers.length > 0 && (
                <div className="wallpaper-grid">
                    {wallpapers.map((wallpaper) => {
                        const isConfirming = confirmingId === wallpaper.id
                        const isDeleting = deletingId === wallpaper.id

                        return (
                            <div
                                key={wallpaper.id}
                                className={[
                                    "wallpaper-card",
                                    isDeleting ? "wallpaper-card-loading" : "",
                                ]
                                    .join(" ")
                                    .trim()}
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveImage(wallpaper)}
                                onKeyDown={(event) => {
                                    // Ignore keys coming from inner buttons
                                    // (delete / confirm / apply)
                                    if (event.target !== event.currentTarget) return

                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault()
                                        setActiveImage(wallpaper)
                                    }
                                }}
                            >
                                <div className="wallpaper-card-image">
                                    {/* loading="lazy" defers offscreen images to the
                                        browser's native lazy loader — enough for a
                                        grid like this. Only reach for a virtualized
                                        list (e.g. react-window) if this ever needs
                                        to hold many hundreds+ of cards at once. */}
                                    <img
                                        src={getLocalImageUrl(wallpaper.image_path)}
                                        alt={`${wallpaper.theme} ${wallpaper.style} wallpaper`}
                                        loading="lazy"
                                    />
                                    <div className="wallpaper-card-scrim" />

                                    {!isConfirming && (
                                        <button
                                            type="button"
                                            className="wallpaper-delete-btn"
                                            aria-label="Delete wallpaper"
                                            disabled={isDeleting}
                                            onClick={(event) =>
                                                handleRequestDelete(wallpaper, event)
                                            }
                                        >
                                            <Delete fontSize="inherit" />
                                        </button>
                                    )}

                                    {isConfirming && (
                                        <div
                                            className="wallpaper-delete-confirm"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <span className="wallpaper-delete-confirm-label">
                                                Delete this wallpaper?
                                            </span>
                                            <div className="wallpaper-delete-confirm-actions">
                                                <button
                                                    type="button"
                                                    className="wallpaper-delete-confirm-button wallpaper-delete-confirm-yes"
                                                    onClick={(event) =>
                                                        handleConfirmDelete(wallpaper, event)
                                                    }
                                                    disabled={isDeleting}
                                                    aria-label="Confirm delete"
                                                >
                                                    <Check fontSize="inherit" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="wallpaper-delete-confirm-button wallpaper-delete-confirm-no"
                                                    onClick={handleCancelDelete}
                                                    disabled={isDeleting}
                                                    aria-label="Cancel delete"
                                                >
                                                    <Close fontSize="inherit" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="wallpaper-card-body">
                                    {deleteErrorId === wallpaper.id && (
                                        <div className="wallpaper-card-error" role="alert">
                                            Couldn't delete. Try again.
                                        </div>
                                    )}

                                    <div className="wallpaper-tags">
                                        <span className="wallpaper-tag tag-style">
                                            <Style fontSize="inherit" />
                                            {wallpaper.style}
                                        </span>
                                        <span className="wallpaper-tag tag-theme">
                                            <Palette fontSize="inherit" />
                                            {wallpaper.theme}
                                        </span>
                                        <span className="wallpaper-tag tag-composition">
                                            <Landscape fontSize="inherit" />
                                            {wallpaper.composition}
                                        </span>
                                        <span className="wallpaper-tag tag-model">
                                            <SmartToy fontSize="inherit" />
                                            {wallpaper.model_name}
                                        </span>
                                    </div>

                                    <div className="wallpaper-meta">
                                        <span className="wallpaper-meta-item">
                                            <CalendarMonth fontSize="inherit" />
                                            {formatDate(wallpaper.generated_on)}
                                        </span>
                                        <span className="wallpaper-meta-item">
                                            <Schedule fontSize="inherit" />
                                            {formatDuration(wallpaper.generation_time_seconds)}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="wallpaper-apply"
                                        disabled={applyingId === wallpaper.id}
                                        onClick={(event) => handleApply(wallpaper, event)}
                                    >
                                        {applyingId === wallpaper.id ? (
                                            <span className="wallpaper-spinner" />
                                        ) : (
                                            <WallpaperIcon fontSize="inherit" />
                                        )}
                                        {applyingId === wallpaper.id
                                            ? "Applying…"
                                            : "Apply wallpaper"}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeImage && (
                <ImageModal
                    src={getLocalImageUrl(activeImage.image_path)}
                    onClose={() => setActiveImage(null)}
                />
            )}

            {toast && <div className="wallpaper-toast">{toast}</div>}
        </div>
    )
}