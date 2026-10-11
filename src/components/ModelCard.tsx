import { useState } from "react"
import "./ModelCard.css"
import { Model } from "../types/Model"
import { deleteModel } from "../api/models"
import { getLocalImageUrl } from "../utils/localImage"
import { tagColorIndex } from "../utils/tagColors"
import DeleteOutlineIcon from "@mui/icons-material/Delete"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"

interface ModelCardProps {
    model: Model
    onDeleted: (modelId: number) => void | Promise<void>
}

function formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024)

    if (mb < 1024) {
        return `${mb.toFixed(0)} MB`
    }

    const gb = mb / 1024
    return `${gb.toFixed(1)} GB`
}

export default function ModelCard({ model, onDeleted }: ModelCardProps) {
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    async function handleConfirmDelete() {
        if (isDeleting) return
        setIsDeleting(true)
        setDeleteError(null)

        try {
            const res = await deleteModel(model.id)

            if (!res.data.deleted) {
                throw new Error("Server did not delete the model")
            }

            // Parent removes the card and refetches the list.
            // No need to reset local state since this card unmounts.
            await onDeleted(model.id)
        } catch (err) {
            console.error("Failed to delete model:", err)
            setDeleteError("Couldn't delete. Try again.")
            setIsDeleting(false)
            setConfirmingDelete(false)
        }
    }

    return (
        <div
            className={["model-card", isDeleting ? "model-card-loading" : ""].join(" ").trim()}
        >
            <div className="model-card-thumbnail">
                <img
                    src={getLocalImageUrl(model.model_thumbnail_path)}
                    alt={model.model_name}
                />

                {!confirmingDelete && model.model_type !== "default" &&(
                    <button
                        type="button"
                        className="model-delete-button"
                        onClick={() => {
                            setDeleteError(null)
                            setConfirmingDelete(true)
                        }}
                        disabled={isDeleting}
                        aria-label="Delete model"
                    >
                        <DeleteOutlineIcon fontSize="inherit" />
                    </button>
                )}

                {confirmingDelete && (
                    <div className="model-delete-confirm">
                        <span className="model-delete-confirm-label">Delete this model?</span>
                        <div className="model-delete-confirm-actions">
                            <button
                                type="button"
                                className="model-delete-confirm-button model-delete-confirm-yes"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                aria-label="Confirm delete"
                            >
                                <CheckIcon fontSize="inherit" />
                            </button>
                            <button
                                type="button"
                                className="model-delete-confirm-button model-delete-confirm-no"
                                onClick={() => setConfirmingDelete(false)}
                                disabled={isDeleting}
                                aria-label="Cancel delete"
                            >
                                <CloseIcon fontSize="inherit" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="model-card-body">
                {deleteError && (
                    <div className="model-card-error" role="alert">
                        {deleteError}
                    </div>
                )}

                <div className="model-card-name">{model.model_name}</div>

                <div className="model-card-description">
                    {model.model_description}
                </div>

                <div className="model-card-tags">
                    {model.model_tags.map((tag) => (
                        <span key={tag} className={`model-tag model-tag-${tagColorIndex(tag)}`}>
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="model-card-footer">
                    <span className="model-card-size">
                        {formatSize(model.model_size)}
                    </span>

                    <span className="model-default">
                        {model.model_type === "default" ? "DEFAULT" : "USER ADDED"}
                    </span>
                </div>
            </div>
        </div>
    )
}