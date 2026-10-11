import { useCallback, useEffect, useState } from 'react'

import wallfluxer from './wallfluxer'


export type ApiStatus = 'starting' | 'ready' | 'failed'

const POLL_INTERVAL_MS = 1000      // how often to ask /health
const ATTEMPT_TIMEOUT_MS = 2000    // give up on a single request after this
const GIVE_UP_AFTER_MS = 120_000    // stop polling and show the retry screen


async function pingHealth(): Promise<boolean> {

  try {
    const res = await wallfluxer.get('/health', { timeout: ATTEMPT_TIMEOUT_MS })
    return res.data?.status === 'ok'

  } catch {
    return false
  }
}


export function useApiReady() {

  const [status, setStatus] = useState<ApiStatus>('starting')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()

    const poll = async () => {

      if (await pingHealth()) {
        if (!cancelled) setStatus('ready')
        return
      }

      if (cancelled) return

      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        setStatus('failed')
        return
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    setStatus('starting')
    poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }

  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { status, retry }
}