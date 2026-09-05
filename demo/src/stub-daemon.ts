/**
 * An Ollama daemon with no Ollama behind it.
 *
 * `OllamaConfig.fetch` is the seam, so the whole tool round — the model asks
 * for a tool, the contract runs it against this page, the answer goes back as
 * a `tool` turn, the model speaks — happens with no daemon, no weights and no
 * network. That is what makes the demo openable and the e2e suite runnable on
 * any box.
 *
 * The wire shapes are read off `modelpact-providers`' own reader, not off the
 * docs: `/api/tags` lists `models[].model`, and `/api/chat` is NDJSON whose
 * last line carries `done` and the counts, with tool calls hanging off
 * `message.tool_calls[].function`.
 */

interface ChatMessage {
  readonly role: string;
  readonly content?: string;
}

interface ToolCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export const STUB_MODEL = "stub:page-reader";

/**
 * Which tool the stub asks for, by keyword. A real model decides this from the
 * descriptions; the point here is that the decision is the model's and the
 * running is the contract's, whoever is deciding.
 */
const chooseCall = (asked: string): ToolCall => {
  const text = asked.toLowerCase();
  if (/outline|structure|heading|section|what is on/.test(text))
    return { name: "pageOutline", arguments: {} };
  if (/table|basket|price|total|cost/.test(text))
    return { name: "readTable", arguments: { selector: "#basket" } };
  if (/button|click|press|element|find/.test(text))
    return { name: "findElements", arguments: { selector: "button" } };
  return { name: "pageText", arguments: {} };
};

const line = (value: unknown): string => `${JSON.stringify(value)}\n`;

const ndjson = (lines: readonly string[]): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      start: (controller) => {
        const encoder = new TextEncoder();
        for (const one of lines) controller.enqueue(encoder.encode(one));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "application/x-ndjson" } },
  );

const askForTool = (call: ToolCall): Response =>
  ndjson([
    line({ message: { content: "" }, done: false }),
    line({
      message: {
        content: "",
        tool_calls: [
          { function: { name: call.name, arguments: call.arguments } },
        ],
      },
      done: true,
      done_reason: "stop",
      prompt_eval_count: 180,
      eval_count: 12,
    }),
  ]);

/** Deltas, more than one, so a caller can tell a stream from a single write. */
const speak = (text: string): Response =>
  ndjson([
    ...text
      .split(/(?<= )/)
      .map((delta) => line({ message: { content: delta }, done: false })),
    line({
      message: { content: "" },
      done: true,
      done_reason: "stop",
      prompt_eval_count: 320,
      eval_count: 48,
    }),
  ]);

const lastToolTurn = (messages: readonly ChatMessage[]): string | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message === undefined) continue;
    if (message.role === "tool") return message.content ?? "";
    if (message.role === "user") return null;
  }
  return null;
};

const firstLine = (text: string): string => {
  const [line] = text.split("\n");
  return (line ?? text).slice(0, 120);
};

/**
 * A `fetch` for `makeOllamaProvider`. It answers a first `/api/chat` with a
 * tool call and the next one — the conversation now carrying a `tool` turn —
 * with words about what came back.
 */
export const stubDaemonFetch: typeof globalThis.fetch = async (
  input,
  init,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (url.endsWith("/api/tags"))
    return new Response(JSON.stringify({ models: [{ model: STUB_MODEL }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  if (!url.endsWith("/api/chat"))
    return new Response(JSON.stringify({ error: "no such endpoint" }), {
      status: 404,
    });

  // The provider always sends a JSON string; anything else is not its request.
  const sent = typeof init?.body === "string" ? init.body : "{}";
  const body = JSON.parse(sent) as {
    messages?: readonly ChatMessage[];
    tools?: readonly unknown[];
  };
  const messages = body.messages ?? [];
  const answered = lastToolTurn(messages);

  if (answered !== null)
    return speak(`Read it. The first line back was "${firstLine(answered)}".`);

  if ((body.tools ?? []).length === 0)
    return speak("No tools were handed over, so there is nothing to read.");

  const asked = [...messages].reverse().find((one) => one.role === "user");
  return askForTool(chooseCall(asked?.content ?? ""));
};
