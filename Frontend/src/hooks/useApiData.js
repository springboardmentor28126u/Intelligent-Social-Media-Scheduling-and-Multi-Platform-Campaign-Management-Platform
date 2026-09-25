import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

/**
 * Load JSON from the API whenever `path` changes. State is only updated from
 * promise callbacks, so effects never set state synchronously.
 */
export function useApiData(path, initial, refreshMs = 0) {
  const [state, setState] = useState({ path: null, data: initial, error: '' })
  useEffect(() => {
    if (!path) return undefined
    let active = true
    api(path)
      .then(data => { if (active) setState({ path, data, error: '' }) })
      .catch(err => { if (active) setState(prev => ({ ...prev, path, error: err.message })) })
    return () => { active = false }
  }, [path])
  const reload = useCallback(async () => {
    try {
      const data = await api(path)
      setState({ path, data, error: '' })
      return data
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }))
      return null
    }
  }, [path])
  useEffect(() => {
    if (!path || !refreshMs) return undefined
    // Silent background refresh: keeps the last good data if a poll fails.
    const timer = setInterval(() => {
      if (document.hidden) return
      api(path).then(data => setState(prev => (prev.path === path ? { path, data, error: '' } : prev))).catch(() => {})
    }, refreshMs)
    return () => clearInterval(timer)
  }, [path, refreshMs])
  const setError = useCallback(error => setState(prev => ({ ...prev, error })), [])
  return { data: state.data, error: state.error, loading: state.path !== path, reload, setError }
}
