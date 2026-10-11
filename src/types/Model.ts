export interface Model {
    id: number
    model_name: string
    model_type: "default" | "user-added"
    model_path: string
    model_description: string
    model_tags: string[]
    model_size: number
    model_thumbnail_path: string
}