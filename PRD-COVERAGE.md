# Digital Heroes PRD coverage

This implementation follows the uploaded Level 1 PRD as the source of truth.

| PRD requirement | Implementation |
|---|---|
| Public visitor | Landing page, charity directory, draw mechanics and signup entry |
| Subscriber | Authenticated member area, profile, scores, charity, draws, winnings |
| Administrator | Protected Admin Studio |
| Monthly/yearly plans | Demo checkout with both plans |
| Subscription lifecycle | Active/inactive state, renewal date, cancellation API |
| Payment gateway | Isolated demo provider; production provider boundary in `services.ts` |
| Last 5 Stableford scores | Rolling five, reverse chronological, one/date, edit/delete |
| Score range 1–45 | Server-side validation |
| Draw types | Random + algorithmic score-weighted simulation |
| Monthly cadence | Draw records keyed by `YYYY-MM` |
| Admin simulation/publish | Draw Studio |
| Prize pool | Automatic active-subscriber calculation |
| 5/4/3 match tiers | 40/35/25 split |
| 5-match rollover | Unclaimed top-tier amount carried into next simulation |
| Equal split among winners | Per-tier prize calculation |
| Charity selection | Signup + member directory |
| Minimum 10% contribution | Server validation |
| Increased charity contribution | 10–50% control |
| Independent donation | Donation endpoint + directory modal |
| Charity search/filter | Directory search + category controls |
| Charity spotlight | Featured seed charities |
| Winner proof | File upload endpoint + member UI |
| Admin verification | Approve/reject controls |
| Payout states | Pending/paid states |
| User dashboard | Subscription, scores, charity, draws, winnings |
| Admin dashboard | Users, draw engine, charities, winners, analytics |
| Responsive UI | Desktop/tablet/mobile CSS |
| Motion/micro-interactions | Framer Motion + hover/transition system |
| Golf clichés avoided | Impact/editorial visual language |
| Clean structured source | Monorepo, typed services, API routes, reusable UI components |
| Error handling | Server validation, HTTP errors, UI toasts and empty states |

## Explicit ambiguity resolutions

The PRD does not specify subscription prices or the exact fixed percentage routed to the prize pool. The project uses **demo defaults** of ₹999/month, ₹9,990/year and 30% prize-pool allocation. These are not claimed as Digital Heroes business rules; they are clearly identified so the evaluator can change them in one service module.

The PRD also describes “5-number match” while score entry is Stableford 1–45. This implementation treats the member's latest five Stableford values as the five-number set used for matching. Duplicate score values collapse as a set for match counting, preventing a single repeated score from inflating a match count.
