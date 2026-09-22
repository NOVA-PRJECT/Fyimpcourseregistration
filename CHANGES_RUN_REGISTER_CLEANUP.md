# Run Log: Remove Auto-Fill & Redundant Labels in Student Registration

## 1. What Was Requested
*"in student register there is automatic filling if only 1 paper in elective type remove that and also remove unnecessary labels like fixed ,auto ,prescribed etc"*

---

## 2. What Was Changed

**File: `frontend/src/app/dashboard/student/register/page.tsx`**

### A. Removed Auto-Filling of Single-Option Electives
- **`loadBlueprint()` (line ~236)**: Removed the `rawBp.slots.forEach` loop that automatically set `initialPrefs[s.slot].rank1 = s.options[0].id` when a slot had only 1 option. Replaced with a comment: `"No auto-selection: students must manually choose all elective papers"`.
- **`selectPathway()` (line ~301)**: Removed the `setRankedPreferences` updater that also auto-selected sole options when switching pathway tracks. Replaced with a comment: `"Preserve existing preferences on pathway change — no auto-selection"`.
- **Effect**: Elective dropdowns now always start with the placeholder `"— Select 1st Choice Preference —"` and require explicit student selection, even when only one option exists. Prior saved preferences still load normally.

### B. Removed `🔒 Fixed Paper` Badge (line ~769)
- Removed the conditional `<span>🔒 Fixed Paper</span>` from slot card headers. The course name and displayed details are self-explanatory without the tag.

### C. Standardized Preference Labels & Subtext
- Removed the conditional `(slot.options?.length ?? 0) === 1 ? 'Prescribed Paper *' : '1st Choice (Primary) *'` toggle — now always shows `1st Choice (Primary) *`.
- Removed the `✓ Auto-Selected Paper` badge span.
- Replaced conditional helper subtext (Prescribed elective paper... Auto-selected) with clean universal text: `"Rank your preferences for this paper. The algorithm allocates round-by-round based on capacity and prerequisites."`

---

## 3. Why
Labels like "Fixed Paper", "Prescribed Paper", and "Auto-Selected Paper" added internal jargon that confused students. Auto-selecting a single-option paper removed student agency and could mask data integrity issues (e.g., the student submitting without realizing they had no choice). Requiring explicit selection ensures the student is aware of their course selections.

---

## 4. Verification & Follow-up
- Dev server running on `http://localhost:3000`.
- **Manual verification steps**:
  1. Navigate to `http://localhost:3000/dashboard/student/register`.
  2. Verify fixed course slots no longer show `🔒 Fixed Paper` badge.
  3. Check elective slots — all dropdowns start with `"— Select 1st Choice Preference —"` even if only 1 option exists.
  4. Verify no `✓ Auto-Selected Paper` badge or `Prescribed Paper *` label visible.
  5. Helper text should read `"Rank your preferences for this paper. The algorithm allocates..."` for all elective slots.
  6. Submit without selecting rank 1 → friendly validation error appears.
