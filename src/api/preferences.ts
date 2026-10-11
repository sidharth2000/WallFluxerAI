import wallfluxer from "./wallfluxer"

export type PreferenceCategory = "STYLE" | "THEME" | "COMPOSITION"

export type PreferenceItem = {
  id: number
  category: PreferenceCategory
  name: string
  positive_prompt_tags: string
  negative_prompt_tags: string
}

export type PreferencePayload = {
  name: string
  positive_prompt_tags: string
  negative_prompt_tags: string
}

// id, category and name only, used by the Create screen
export const getPreferences = () => {

  return wallfluxer.get("/preferences/list")

}

export const getPreferencesByCategory = (category: string) => {

  return wallfluxer.get("/preferences/list", {
    params: {
      category,
    },
  })

}

// everything including prompts, used by the Prompt Presets screen
export const getAllPreferences = () => {

  return wallfluxer.get<PreferenceItem[]>("/preferences/all")

}

export const createPreference = (
  data: PreferencePayload & { category: PreferenceCategory }
) => {

  return wallfluxer.post<PreferenceItem>("/preferences/add", data)

}

export const updatePreference = (
  id: number,
  data: Partial<PreferencePayload>
) => {

  return wallfluxer.patch<PreferenceItem>(`/preferences/${id}`, data)

}

export const deletePreference = (id: number) => {

  return wallfluxer.delete(`/preferences/${id}`)

}

// pulls the backend's "detail" message out of an error
export const getErrorMessage = (error: any): string => {

  const detail = error?.response?.data?.detail

  if (typeof detail === "string") return detail

  return "Something went wrong. Please try again."

}

export type PreferenceImage = {
  id: number
  image_path: string
}

// images generated with a given style, theme or composition
export const getPreferenceImages = (id: number) => {

  return wallfluxer.get<PreferenceImage[]>(`/wallpaper/by-preference/${id}`)

}