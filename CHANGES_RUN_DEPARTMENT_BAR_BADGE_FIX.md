# Changes Run: Fix Hidden Credit Count on Department Bar Graph

## What Was Requested
The user reported with an attached image that in the **"Credits Earned by Academic Department"** section of the Credit Ledger, the top bar ("Department of Studies in English") was hiding the credit count because the dark navy bar fill (`.barFill`) expanded over the absolutely positioned dark navy text (`.barBadge`), rendering the text invisible against the background.

---

## What Was Changed

1. **Markup Architecture (`CreditLedgerView.tsx`)**:
   - In [`CreditLedgerView.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/components/credit-ledger/CreditLedgerView.tsx), wrapped the progress bar and credit count into a flex container:
     ```tsx
     <div className={styles.barTrackWrapper}>
       <div className={styles.barTrack}>
         <div
           className={styles.barFill}
           style={{ width: `${widthPercent}%` }}
         />
       </div>
       <span className={styles.barBadge}>{dept.earned} Credits</span>
     </div>
     ```

2. **CSS Layout & Styling (`credit-ledger.module.css`)**:
   - In [`credit-ledger.module.css`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/components/credit-ledger/credit-ledger.module.css):
     - Created `.barTrackWrapper` with `display: flex; align-items: center; gap: 0.85rem; width: 100%`.
     - Gave `.barTrack` `flex: 1` so it cleanly occupies all remaining space.
     - Removed `position: absolute; right: 0.75rem` from `.barBadge`.
     - Styled `.barBadge` with `min-width: 72px; text-align: right; font-weight: 800; color: #002147; flex-shrink: 0`, placing the credit count in its own column adjacent to the bar track.
     - Added responsive scaling in `@media (max-width: 768px)`.

---

## Result
Regardless of the bar fill percentage (0% to 100%), the progress bar will **never** overlap or obscure the credit count. Every department bar displays its credit count in a crisp, vertically aligned column on the right side of the track.
