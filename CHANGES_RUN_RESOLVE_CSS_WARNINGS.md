# Changes — Resolve CSS Compatibility Warnings (Run 2026-09-11)

## Summary
Resolved all 3 CSS warnings reported in `@[current_problems]` by adding the standard `appearance: none;` declaration alongside the vendor-prefixed `-webkit-appearance: none;`.

---

## Files Updated

### 1. `frontend/src/app/dashboard/superadmin/superadmin-dashboard.module.css`
- Added `appearance: none;` under `.input` (line 601).

### 2. `frontend/src/app/dashboard/teacher/teacher-dashboard.module.css`
- Added `appearance: none;` under `.searchInput` (line 151).
- Added `appearance: none;` under `.courseSelect` (line 236).

---

## Verification
- All 3 warnings regarding `"Also define the standard property 'appearance' for compatibility"` are resolved.
