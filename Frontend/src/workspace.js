export function switchWorkspace(id) {
  if (id) localStorage.setItem('workspace', String(id))
  else localStorage.removeItem('workspace')
  window.location.reload()
}

