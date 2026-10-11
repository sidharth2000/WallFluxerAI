import { useEffect, useState, useCallback } from "react"
import { getModels } from "../api/models"
import { Model } from "../types/Model"
import ModelCard from "../components/ModelCard"
import AddModelModal from "../components/AddModelModal"
import AddIcon from "@mui/icons-material/Add"
import "./MyModels.css"

export default function MyModels() {
    const [modelList, setModelList] = useState<Model[]>([])
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const loadModels = useCallback(async () => {
        try {
            const response = await getModels()
            setModelList(response.data.models)
        } catch (error) {
            console.error("Failed to load models:", error)
        }
    }, [])

    // Load models on mount
    useEffect(() => {
        loadModels()
    }, [loadModels])

    // Remove the card right away, then sync the list with the server
    async function handleModelDeleted(modelId: number) {
        setModelList((prev) => prev.filter((m) => m.id !== modelId))
        await loadModels()
    }

    // Filter models based on the search query
    const filteredModels = modelList.filter((model) =>
        model.model_name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )

    return (
        <div className="models-screen">
            <div className="models-toolbar">
                <div className="models-search">
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <button
                    className="add-model-button"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <AddIcon fontSize="small" />
                    Add Model
                </button>
            </div>

            <div className="models-content">
                {filteredModels.map((model) => (
                    <ModelCard
                        key={model.id}
                        model={model}
                        onDeleted={handleModelDeleted}
                    />
                ))}

                {filteredModels.length === 0 && (
                    <div className="no-models-message">
                        {searchQuery.trim()
                            ? "No models match your search."
                            : "No models available."}
                    </div>
                )}
            </div>

            <AddModelModal
                handleClose={() => setIsAddModalOpen(false)}
                open={isAddModalOpen}
                onModelAdded={loadModels}
            />
        </div>
    )
}