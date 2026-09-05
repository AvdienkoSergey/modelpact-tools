/**
 * The demo: one ordinary page, and the tools reading it.
 *
 * Three things are on show, in the order they matter. The kit is a shelf and
 * `selectTools` is the picking, so the token cost moves as boxes are ticked.
 * A tool is a function, so it can be called with no model at all. And a tool
 * round is the contract's, not the app's — the `stub` provider proves it with
 * no daemon behind it.
 */
import type { AiFailure, AiSession, Tool } from "modelpact";
import {
  estimateRequestTokens,
  estimateToolTokens,
  selectTools,
} from "modelpact-tools";
import { makeReadKit } from "modelpact-tools/dom";

import {
  PROVIDER_NAMES,
  PROVIDERS,
  type DemoProviderName,
} from "./providers.js";

/** Gemini Nano's, and the number every cost on screen is measured against. */
const NANO_WINDOW = 9_216;

/**
 * Each failure carries only its own fields, so `detail` is not there to read
 * on every kind — `unsupported` and `unknown` have nothing but the name.
 */
const detailOf = (failure: AiFailure): string =>
  "detail" in failure ? failure.detail : failure.kind;

const need = <T extends Element>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (found === null) throw new Error(`the demo is missing ${selector}`);
  return found;
};

/**
 * Rooted on the page, not on `document`: the panel is markup too, and a tool
 * reading its own controls back to the model would be a demo lying about what
 * these tools see in an app. Title and address still come through — they are
 * facts about the page, whatever the root.
 */
const kit = makeReadKit({ root: need("main.page"), maxChars: 1_200 });

const picker = need<HTMLDivElement>("#tool-picker");
const budget = need<HTMLParagraphElement>("[data-testid='budget']");
const benchTool = need<HTMLSelectElement>("#bench-tool");
const benchArgs = need<HTMLInputElement>("#bench-args");
const benchRun = need<HTMLButtonElement>("#bench-run");
const benchOut = need<HTMLPreElement>("#bench-out");
const providerPick = need<HTMLSelectElement>("#provider");
const accessChip = need<HTMLSpanElement>("#access");
const ask = need<HTMLInputElement>("#ask");
const send = need<HTMLButtonElement>("#send");
const callList = need<HTMLOListElement>("#calls");
const answerOut = need<HTMLPreElement>("#answer");

const chosen = new Set(kit.tools.map((tool) => tool.name));

const selected = (): readonly Tool[] =>
  selectTools([kit], { only: [...chosen] });

const drawBudget = (): void => {
  const cost = estimateRequestTokens(selected());
  const share = ((cost / NANO_WINDOW) * 100).toFixed(1);
  budget.textContent =
    chosen.size === 0
      ? "Nothing selected — no preamble, no cost."
      : `${cost} tokens of Gemini Nano's ${NANO_WINDOW} — ${share}%, preamble included.`;
};

const drawPicker = (): void => {
  picker.replaceChildren(
    ...kit.entries.map((entry) => {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = chosen.has(entry.tool.name);
      box.dataset.tool = entry.tool.name;
      box.addEventListener("change", () => {
        if (box.checked) chosen.add(entry.tool.name);
        else chosen.delete(entry.tool.name);
        drawBudget();
      });

      const cost = document.createElement("span");
      cost.className = "cost";
      cost.textContent = `${estimateToolTokens(entry.tool)} tok`;

      const label = document.createElement("label");
      label.append(box, document.createTextNode(entry.tool.name), cost);
      return label;
    }),
  );
};

/** What each tool is worth typing first, so the bench opens on something real. */
const SUGGESTED: Readonly<Record<string, string>> = {
  pageText: '{ "selector": "#basket" }',
  pageOutline: "{}",
  findElements: '{ "selector": "button" }',
  readTable: '{ "selector": "#basket" }',
};

const drawBench = (): void => {
  benchTool.replaceChildren(
    ...kit.tools.map((tool) => new Option(tool.name, tool.name)),
  );
  benchArgs.value = SUGGESTED[benchTool.value] ?? "{}";
};

benchTool.addEventListener("change", () => {
  benchArgs.value = SUGGESTED[benchTool.value] ?? "{}";
});

benchRun.addEventListener("click", () => {
  const tool = kit.tools.find((one) => one.name === benchTool.value);
  if (tool === undefined) return;

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(benchArgs.value || "{}") as Record<string, unknown>;
  } catch {
    benchOut.textContent = "those arguments are not JSON";
    return;
  }

  void Promise.resolve(tool.execute(input, new AbortController().signal)).then(
    (said) => (benchOut.textContent = said),
    // A throw here would be the tool breaking its own rule, so it is worth
    // showing rather than swallowing.
    (error: unknown) => (benchOut.textContent = `it threw: ${String(error)}`),
  );
});

/**
 * The call log. `AiSession` reports turns, not tool calls — the calls happen
 * inside one — so the only place to see them is the tool itself, wrapped on
 * the way into the request.
 */
const logged = (tools: readonly Tool[]): readonly Tool[] =>
  tools.map((tool) => ({
    ...tool,
    execute: async (input: Record<string, unknown>, signal: AbortSignal) => {
      const said = await tool.execute(input, signal);
      const item = document.createElement("li");
      const call = document.createElement("code");
      call.textContent = `${tool.name}(${JSON.stringify(input)})`;
      item.append(call, document.createTextNode(` → ${said.length} chars`));
      callList.append(item);
      return said;
    },
  }));

const drawProviders = (): void => {
  providerPick.replaceChildren(
    ...PROVIDER_NAMES.map((name) => new Option(name, name)),
  );
};

const setChip = (kind: string, text: string): void => {
  accessChip.dataset.kind = kind;
  accessChip.textContent = text;
};

const readStream = async (stream: ReadableStream<string>): Promise<void> => {
  const reader = stream.getReader();
  answerOut.textContent = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) return;
    answerOut.textContent += chunk.value;
  }
};

const turn = async (session: AiSession, input: string): Promise<void> => {
  const started = await session.promptStream(input);
  if (!started.ok) {
    answerOut.textContent = `${started.error.kind}: ${detailOf(started.error)}`;
    return;
  }
  await readStream(started.value);
};

const askTheModel = async (): Promise<void> => {
  callList.replaceChildren();
  answerOut.textContent = "";

  const provider = PROVIDERS[providerPick.value as DemoProviderName];
  const tools = logged(selected());
  const access = await provider.access(tools.length === 0 ? {} : { tools });

  if (access.kind === "unavailable") {
    setChip("unavailable", `unavailable — ${access.reason.kind}`);
    answerOut.textContent = `${detailOf(access.reason)} — nothing here answers for that request; try the stub.`;
    return;
  }
  if (access.kind === "needs-download") {
    setChip("needs-download", "weights not on this machine");
    answerOut.textContent = "this backend wants a download first.";
    return;
  }

  setChip("ready", "ready");
  const opened = await access.open({
    system: "You read the page with the tools you are given. Be brief.",
  });
  if (!opened.ok) {
    answerOut.textContent = `${opened.error.kind}: ${detailOf(opened.error)}`;
    return;
  }

  try {
    await turn(opened.value, ask.value || "what is on this page?");
  } finally {
    opened.value.close();
  }
};

send.addEventListener("click", () => {
  send.disabled = true;
  void askTheModel()
    .catch((error: unknown) => {
      answerOut.textContent = `it threw: ${String(error)}`;
    })
    .finally(() => {
      send.disabled = false;
      send.dataset.state = "idle";
    });
});

ask.addEventListener("keydown", (event) => {
  if (event.key === "Enter") send.click();
});

drawPicker();
drawBudget();
drawBench();
drawProviders();
