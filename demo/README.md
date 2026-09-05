# modelpact-tools demo

One ordinary page, and the tools reading it.

```sh
npm install          # from the repository root — the demo is a workspace
npm run build        # the demo consumes the built package, not src/
npm run dev --workspace demo
```

Then <http://127.0.0.1:5174>.

## What is on the screen

Everything left of the divider is a checkout page that knows nothing about any
of this. Everything right of it reads that page through `document`, the way it
would read the app this package is dropped into. The kit is rooted on the
`<main>`, not on the document, so the panel does not read itself back to the
model — and `pageOutline` still reports the page's title and address, because
those are facts about the page whatever the root.

**The kit, and what it costs.** Tick a tool and the number moves. That is
`selectTools` and `estimateRequestTokens`: nothing is charged to the window
until it is in the array handed to `access`.

**Call one by hand.** A tool is a function, so no model is involved. This is
also where the prose is visible — ask for `(((`, or a selector that matches
nothing, and read what the model would have read.

**Ask a model.** The picker holds three backends and only one of them needs
anything on your machine.

| Pick         | What answers                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `stub`       | `makeOllamaProvider` over a `fetch` that answers from [`src/stub-daemon.ts`](src/stub-daemon.ts) — real wire shapes, no daemon, no weights |
| `ollama`     | `granite4:350m` on a daemon at `127.0.0.1:11434`, if you have one                                                                          |
| `prompt-api` | Chrome's built-in model, and `unavailable` everywhere else                                                                                 |

The list under the box is the tool calls. `AiSession` reports turns, not the
calls inside one, so the demo wraps each tool on its way into the request —
which is itself worth knowing if you want the same log in your app.

## The e2e suite

```sh
npx playwright install chromium
npm run e2e --workspace demo
```

Fifteen specs, no daemon and no weights: the `stub` provider makes a real tool
round deterministic, so CI runs the whole loop — the model asks for a tool, the
contract runs it against the page, the answer goes back as a turn.

They also pin the answers a model actually reads. The one worth pointing at is
`page text runs the table together, which is what readTable is for`: the same
table through both tools, side by side, is the whole argument for that tool
existing.
