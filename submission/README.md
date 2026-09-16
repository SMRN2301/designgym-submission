# DesignGym Submission Bundle

This folder contains the recruiter-ready PDF exports for the CipherSchools internship assignment.

| Assignment requirement | Repository source | PDF export |
| --- | --- | --- |
| Research note | [`docs/RESEARCH.md`](../docs/RESEARCH.md) | [`DesignGym-Research-Note.pdf`](pdfs/DesignGym-Research-Note.pdf) |
| Design note | [`docs/DESIGN.md`](../docs/DESIGN.md) | [`DesignGym-Design-Note.pdf`](pdfs/DesignGym-Design-Note.pdf) |
| Working prototype | The React + TypeScript application in this repository | [Open the live prototype](manus-webdev://7063a811) |
| Tests | `client/src/lib/designgym.test.ts`, `server/*.test.ts` | Covered by `pnpm test` |
| README + AI_USAGE.md | [`README.md`](../README.md), [`AI_USAGE.md`](../AI_USAGE.md) | [`DesignGym-README.pdf`](pdfs/DesignGym-README.pdf), [`DesignGym-AI-Usage.pdf`](pdfs/DesignGym-AI-Usage.pdf) |

## Verification status

The final package was checked with `pnpm check`, `pnpm build`, and `pnpm test`. The test suite contains 16 passing tests across domain and backend behavior. Each PDF passed the Typst strict compile gate and the text-document PDF verifier with zero warnings and zero failures.

## Reviewer path

Start with the root [`README.md`](../README.md) for the product narrative and run instructions. Continue to [`docs/DESIGN.md`](../docs/DESIGN.md) for the guarded Attempt state machine, the two Section 9 change tests, and the evaluator fallback boundary. Use [`docs/RESEARCH.md`](../docs/RESEARCH.md) for product rationale and [`AI_USAGE.md`](../AI_USAGE.md) for the four explicit engineering decisions.
