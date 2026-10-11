import wallfluxer, { apiUrl } from './wallfluxer'

export type InstantGeneratePayload = {
    core_idea: string
    preference_style_ids: number[]
    preference_composition_ids: number[]
    preference_theme_ids: number[]
    model_id: number
    width: number
    height: number
    steps: number
}

export type InstantGenerateResponse = {
    job_id: string
}

export const instantGenerate = (payload: InstantGeneratePayload) => {
    return wallfluxer.post<InstantGenerateResponse>(
        '/generation/instant-generate',
        payload
    )
}

export const getJobStreamUrl = (jobId: string) => {
    return apiUrl(`/jobs/${jobId}/stream`)
}