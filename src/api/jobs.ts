import { API_BASE_URL } from "../api/wallfluxer"


export interface JobEventPayload {
    stage: string
    progress: number
    message: string
    done: boolean
    error?: string
    payload?: any
}

export function subscribeToJob(
    jobId: string,
    handlers: {
        onEvent: (event: JobEventPayload) => void
        onError?: (err: Event) => void
    }
): () => void {
    const es = new EventSource(`${API_BASE_URL}/jobs/${jobId}/stream`)

    es.onmessage = (e) => {
        const data: JobEventPayload = JSON.parse(e.data)
        handlers.onEvent(data)
        if (data.done) es.close()
    }

    es.onerror = (err) => {
        handlers.onError?.(err)
        es.close()
    }

    return () => es.close()
}