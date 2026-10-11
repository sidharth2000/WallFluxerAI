import { useEffect, useRef, useState } from "react"
import {
    Close,
    Add,
    Remove,
    RestartAlt,
} from "@mui/icons-material"

import "./ImageModal.css"

type ImageModalProps = {
    src: string
    onClose: () => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export default function ImageModal({
    src,
    onClose,
}: ImageModalProps) {

    const [zoom, setZoom] = useState<number>(1)
    const [position, setPosition] = useState({
        x: 0,
        y: 0,
    })

    const [isDragging, setIsDragging] = useState<boolean>(false)

    const dragStart = useRef({
        x: 0,
        y: 0,
    })

    const positionStart = useRef({
        x: 0,
        y: 0,
    })

    // ---------------------------------------------------------
    // Close with Escape
    // ---------------------------------------------------------

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }

            if (event.key === "+" || event.key === "=") {
                setZoom((current) =>
                    Math.min(MAX_ZOOM, current + ZOOM_STEP)
                )
            }

            if (event.key === "-") {
                setZoom((current) =>
                    Math.max(MIN_ZOOM, current - ZOOM_STEP)
                )
            }

            if (event.key === "0") {
                setZoom(1)
                setPosition({ x: 0, y: 0 })
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [onClose])

    // ---------------------------------------------------------
    // Zoom with mouse wheel
    // ---------------------------------------------------------

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault()

        const direction = event.deltaY > 0 ? -1 : 1

        setZoom((current) =>
            Math.min(
                MAX_ZOOM,
                Math.max(
                    MIN_ZOOM,
                    current + direction * ZOOM_STEP
                )
            )
        )
    }

    // ---------------------------------------------------------
    // Drag / pan
    // ---------------------------------------------------------

    const handleMouseDown = (
        event: React.MouseEvent<HTMLImageElement>
    ) => {
        if (event.button !== 0) return

        setIsDragging(true)

        dragStart.current = {
            x: event.clientX,
            y: event.clientY,
        }

        positionStart.current = {
            ...position,
        }
    }

    const handleMouseMove = (
        event: React.MouseEvent<HTMLDivElement>
    ) => {
        if (!isDragging) return

        const dx = event.clientX - dragStart.current.x
        const dy = event.clientY - dragStart.current.y

        setPosition({
            x: positionStart.current.x + dx,
            y: positionStart.current.y + dy,
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    // ---------------------------------------------------------
    // Double click zoom
    // ---------------------------------------------------------

    const handleDoubleClick = () => {
        setZoom((current) => {
            if (current > 1) {
                setPosition({ x: 0, y: 0 })
                return 1
            }

            return 2
        })
    }

    // ---------------------------------------------------------
    // Reset
    // ---------------------------------------------------------

    const resetView = () => {
        setZoom(1)
        setPosition({
            x: 0,
            y: 0,
        })
    }

    // ---------------------------------------------------------
    // Render
    // ---------------------------------------------------------

    return (
        <div
            className="image-modal-overlay"
            onClick={onClose}
            onWheel={handleWheel}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >

            {/* Close */}
            <button
                type="button"
                className="image-modal-close"
                onClick={(event) => {
                    event.stopPropagation()
                    onClose()
                }}
                aria-label="Close image viewer"
            >
                <Close fontSize="small" />
            </button>

            {/* Image area */}
            <div
                className={`image-modal-viewer ${
                    isDragging ? "is-dragging" : ""
                }`}
                onClick={(event) => event.stopPropagation()}
            >
                <img
                    src={src}
                    alt="Wallpaper preview"
                    className="image-modal-img"
                    draggable={false}
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                    style={{
                        transform: `
                            translate3d(
                                ${position.x}px,
                                ${position.y}px,
                                0
                            )
                            scale(${zoom})
                        `,
                    }}
                />
            </div>

            {/* Controls */}
            <div
                className="image-modal-controls"
                onClick={(event) => event.stopPropagation()}
            >

                <button
                    type="button"
                    onClick={() => {
                        setZoom((current) =>
                            Math.max(
                                MIN_ZOOM,
                                current - ZOOM_STEP
                            )
                        )
                    }}
                    disabled={zoom <= MIN_ZOOM}
                    aria-label="Zoom out"
                    title="Zoom out"
                >
                    <Remove />
                </button>

                <span className="image-modal-zoom">
                    {Math.round(zoom * 100)}%
                </span>

                <button
                    type="button"
                    onClick={() => {
                        setZoom((current) =>
                            Math.min(
                                MAX_ZOOM,
                                current + ZOOM_STEP
                            )
                        )
                    }}
                    disabled={zoom >= MAX_ZOOM}
                    aria-label="Zoom in"
                    title="Zoom in"
                >
                    <Add />
                </button>

                <div className="image-modal-divider" />

                <button
                    type="button"
                    onClick={resetView}
                    aria-label="Reset view"
                    title="Reset view"
                >
                    <RestartAlt />
                </button>

            </div>

            <div className="image-modal-hint">
                Scroll to zoom&nbsp;&nbsp; • &nbsp;&nbsp;Drag to pan&nbsp;&nbsp; • &nbsp;&nbsp;Esc to close
            </div>

        </div>
    )
}