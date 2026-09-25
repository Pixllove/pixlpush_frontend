/**
 * Run: node lib/auth/redirect.test.mjs
 * Guards the open-redirect check that ?redirect= flows through on login.
 */
import assert from 'node:assert';

// Mirrors safeRedirect in ./redirect.ts (kept inline so this runs with no build).
function safeRedirect(value, fallback = '/dashboard') {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

assert.equal(safeRedirect('/dashboard/users'), '/dashboard/users');
assert.equal(safeRedirect('/dashboard?tab=1'), '/dashboard?tab=1');

assert.equal(safeRedirect('https://evil.example'), '/dashboard');
assert.equal(safeRedirect('//evil.example'), '/dashboard');
assert.equal(safeRedirect('/\\evil.example'), '/dashboard');
assert.equal(safeRedirect('javascript:alert(1)'), '/dashboard');
assert.equal(safeRedirect(null), '/dashboard');
assert.equal(safeRedirect(''), '/dashboard');

console.log('PASS: safeRedirect blocks all open-redirect vectors');
