import wallfluxer from "./wallfluxer"
import { AxiosResponse } from "axios"

export interface AddModelResponse {
  job_id: string
}

export interface DeleteModelResponse {
  deleted: boolean
  id: number
}

export const getModels = () => {
  return wallfluxer.get("/model/all")
}

export const addModel = (model: {
  model_name: string
  model_path: string
  model_description: string
  model_tags: string[]
}): Promise<AxiosResponse<AddModelResponse>> => {
  return wallfluxer.post("/model/addmodel", model)
}

export const deleteModel = (
  modelId: number
): Promise<AxiosResponse<DeleteModelResponse>> => {
  return wallfluxer.delete(`/model/${modelId}`)
}