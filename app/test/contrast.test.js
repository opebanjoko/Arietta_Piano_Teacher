import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8')

function token(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  assert.ok(m, `token --${name} must be a hex literal in theme.css`)
  return m[1]
}

function luminance(hex) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const BACKGROUNDS = ['paper', 'paper-top', 'card', 'card-warm']
const PRIMARY = ['ink', 'ink-soft']          // body text: WCAG AA 4.5:1
const SECONDARY = ['ink-mid', 'ink-mono', 'ink-faint'] // labels/kickers: 3:1

for (const fg of PRIMARY) {
  for (const bg of BACKGROUNDS) {
    test(`--${fg} on --${bg} meets 4.5:1`, () => {
      const r = ratio(token(fg), token(bg))
      assert.ok(r >= 4.5, `${r.toFixed(2)}:1`)
    })
  }
}

for (const fg of SECONDARY) {
  for (const bg of BACKGROUNDS) {
    test(`--${fg} on --${bg} meets 3:1`, () => {
      const r = ratio(token(fg), token(bg))
      assert.ok(r >= 3, `${r.toFixed(2)}:1`)
    })
  }
}
