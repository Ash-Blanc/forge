# FORGE MVP Gate (3-Paper Quality + Clarity)

A build is "strong" only if all three benchmark papers pass in both surfaces:
- `streamlit-prototype`
- `full-stack-web/app/dashboard`

## Required pass criteria

1. Fidelity
- Core claims are grounded in paper content.
- No fabricated metrics, datasets, or benchmark claims.
- Method and novelty are explained accurately.

2. Specificity
- Output avoids generic startup language.
- Evidence section includes concrete observations.
- Limitations/assumptions are explicit when known.

3. Actionability
- One recommended thesis is clear and scoped.
- Two backup paths are meaningfully distinct.
- First milestone is practical and shippable.

4. Clarity
- A reader can understand the paper + recommendation in under 3 minutes.
- Presentation is paper-first (analysis before commercialization).

## Daily dogfood checklist

- [ ] Run all 3 benchmark papers in Streamlit
- [ ] Run all 3 benchmark papers in full-stack dashboard
- [ ] Mark pass/fail for each criterion above
- [ ] Log key regressions and fix priorities in `docs/wip-log.md`
