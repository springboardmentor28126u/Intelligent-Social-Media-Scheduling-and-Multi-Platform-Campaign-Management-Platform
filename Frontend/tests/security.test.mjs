import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { apiSource } from '../security-config.mjs'

test('CSP API source is restricted to the configured origin', () => {
  assert.equal(apiSource('/api'), "'self'")
  assert.equal(apiSource('https://api.example.com/v1'), 'https://api.example.com')
  for (const value of ['https://*.example.com', 'https://%2A.example.com', '//evil.example.com', 'javascript:alert(1)', "https://api.example.com; script-src *", 'https://user:pass@example.com']) {
    assert.throws(() => apiSource(value))
  }
})

test('both frontend servers set all required headers and forbid inline scripts', () => {
  const nginx = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const headers = vercel.headers[0].headers
  for (const name of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.ok(nginx.includes(`add_header ${name} `))
    assert.ok(headers.some(header => header.key === name))
  }
  for (const csp of [nginx.match(/add_header Content-Security-Policy "([^"]+)"/)[1], headers.find(h => h.key === 'Content-Security-Policy').value]) {
    assert.match(csp, /script-src 'self';/)
    assert.equal(csp.match(/connect-src ([^;]+);/)[1], apiSource(process.env.VITE_API_URL || '/api'))
    assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"))
  }
})

test('password checks and messages apply only to registration and new passwords', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const profile = readFileSync(new URL('../src/pages/Profile.jsx', import.meta.url), 'utf8')
  assert.match(app, /if \(isRegister\) \{\s*if \(password.length < 8\)/)
  assert.match(app, /Password must be at least 8 characters/)
  assert.match(profile, /passwords.next.length < 8/)
  assert.match(profile, /New password must be at least 8 characters/)
})
