// Adjust the `api` import to match whatever axios instance
// api/generation.ts uses (same one getModels/getPreferences use).
import api from './wallfluxer'

export type SchedulerStartPayload = {
    core_idea: string
    style: number[]
    composition: number[]
    theme: number[]
    model_id: number
    interval_minutes: number
    idle_minutes: number
    plugged_in_only: boolean
    idle_threshold: number
}

export const startScheduler = (payload: SchedulerStartPayload) =>
    api.post('/scheduler/start', payload)

export const stopScheduler = () => api.post('/scheduler/stop')

export const getSchedulerState = () => api.get('/scheduler/state')

// Mirror however getJobStreamUrl in api/generation.ts builds its URL —
// same base, different path.
export const getSchedulerStreamUrl = () => {
    const base = api.defaults.baseURL ?? ''
    return `${base}/scheduler/stream`
}