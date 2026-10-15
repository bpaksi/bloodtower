# Test pack (`packs/test`)

The proving ground R1 loads. It is not a published story, and it is the only pack this step loads.

| | |
|---|---|
| Hunters | alpha, beta, gamma, delta |
| Nights | n1 |
| Set piece | proving-ground |
| Moments | a shared still, its `~no-delta` variant, private moments for alpha and delta, a shared line with one cue |
| Cue | `bell`: screen `fx.bell`, fallback `sfx.bell`, drums `none` |

`pnpm --dir apps/bloodtower pack:lint` checks this folder. A `choices` file is parsed and kept. Nothing runs it.
