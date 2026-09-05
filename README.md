# modelpact-tools

Tools a model can call, written against the modelpact contract and held to it
by tests

## Install

```sh
npm install modelpact-tools modelpact
```

`modelpact` is a peer dependency: this package is built against its contract
and does not carry a copy of it.

## Use

```ts
import { INSPECT, selectTools } from "modelpact-tools";
import { makeReadKit } from "modelpact-tools/dom";

const kit = makeReadKit({ maxChars: 2_000 });
const access = await provider.access({
  tools: selectTools([kit], { only: INSPECT }),
});
```

## Kits, presets and the window

Tools cost window. modelpact measures about 50 tokens for one tool plus 100 to
200 for the preamble, against Gemini Nano's 9 216 — eight tools are five per
cent of that, thirty-two are a fifth. So the question a catalogue has to answer
is not "where does this tool live" but "which tools go in this turn".

Nothing is charged until it is in the array handed to `access`. `selectTools`
is that array, and it is the only thing that bounds the cost — an `exports`
subpath does not.

**A kit is a risk.** `makeReadKit` cannot change the page; the write kit will
only be built with a guard. **A preset is a task.** The two cross on purpose:
`formFields` reads and `fillField` writes, and both are what anyone means by
"forms", so neither can be expressed as the other.

```ts
selectTools([kit], { only: INSPECT }); // a preset
selectTools([kit], { effect: "read" }); // one side of the risk line
selectTools([kit], { only: ["pageOutline", "findElements"], maxTools: 2 });
```

A name `only` cannot find throws. That is the one place here that throws rather
than answering in prose: prose is for `execute`, where the input comes from a
model that can read the answer and correct itself, and this input comes from a
developer at wiring time, where silence means a tool quietly missing from the
window.

`estimateRequestTokens(kit.tools)` says what a selection costs before you send
it.

| Entry                     | What is in it                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `modelpact-tools`         | kits, presets, `selectTools`, the budget, shared helpers — names no global, runs in node |
| `modelpact-tools/dom`     | the tools that read a page, and `makeReadKit`                                            |
| `modelpact-tools/testing` | `describeToolContract`, `describeKitContract`                                            |

## The tools

| Tool           | What it answers                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| `pageText`     | the visible text of the page or one element — modelpact's own, carried here     |
| `pageOutline`  | title, address and the heading tree, with a selector for each heading           |
| `findElements` | the elements matching a selector: tag, text, attributes and a selector for each |
| `readTable`    | a table as rows of cells, because page text runs one together                   |

`pageOutline` then `findElements` is the loop the kit is built for: orient for a
few hundred tokens, then address one thing by name.

Every mistake in the arguments comes back as a sentence — a selector that
matches nothing, one that is not a selector, a number where a string was
wanted. A throw from `execute` fails the whole turn; a sentence is something
the model can act on next call.

Coming, in this order: handles that survive a re-render and `waitFor`;
`elementInfo`; the write kit (`formFields`, `fillField`, `submitForm`) behind a
required guard; the recorders and `consoleLog`, `networkLog`, `lastErrors`;
then `readArticle`, `structuredData`, `clickElement`, `setText`.

## The contract

Every tool here passes the same suite, and so can yours:

```ts
import {
  describeKitContract,
  describeToolContract,
} from "modelpact-tools/testing";

describeKitContract("the read kit", () => makeReadKit({ root: document }));
describeToolContract("myTool", () => readEntry(makeMyTool()));
```

It asserts that the argument shape survives `jsonSchema` and closes itself to
extra properties, that every argument is described, that the name is a short
camelCase identifier, that a tool changing the page says so in both its name
and its description, that it costs at most 100 estimated tokens, and that no
argument — a wrong type, a null, `__proto__`, ten thousand characters — makes
it throw rather than answer.

Run it under `environment: "node"` and it also says the tool does not reach for
a `document` that is not there. That is not a separate assertion: reaching for
one throws, and throwing is what the suite forbids.

The suite is run against a tool built by `makeMockTool`, modelpact's own
fixture, which knows nothing about this package. That is what makes it a test
of the contract rather than of the four files next to it.

## See it before you install it

[`demo/`](demo/) is a checkout page with the tools reading it beside it. Tick a
tool and watch the token cost move; call one by hand with no model at all; or
ask a model and watch the call it made.

```sh
npm install && npm run build
npm run dev --workspace demo
```

The picker's default is `stub` — `makeOllamaProvider` over a `fetch` that
answers canned NDJSON — so a real tool round runs with no daemon, no weights
and no network. That is also what makes the Playwright suite deterministic:
fifteen specs covering the whole loop, and the exact prose a model reads back
from every mistake in the arguments.

```sh
npx playwright install chromium
npm run e2e --workspace demo
```

## Scripts

| Script                 | What it does                     |
| ---------------------- | -------------------------------- |
| `npm run typecheck`    | `tsc --noEmit` over `src`        |
| `npm run lint`         | ESLint, type-aware               |
| `npm run format:check` | Prettier, check only             |
| `npm test`             | Vitest, once                     |
| `npm run test:watch`   | Vitest, watching                 |
| `npm run build`        | `dist/` — JS, declarations, maps |

DOM tests opt into jsdom per file with `@vitest-environment jsdom`; the default
stays node, and `src/types.test-d.ts` is checked by `typecheck` rather than run.

## Releases

Versions come from [conventional commits](https://www.conventionalcommits.org)
by way of release-please, and are published to npm from CI by trusted
publishing. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
