// Based on AndrewStrong615/prompt-improver (MIT). Changes: one flow on every surface — the button sits
// beside the band above the prompt box, reads the draft straight from the box, replaces it, and names a model for it.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Phase } from '../types'

const phase = atom({ plugin: 'prompt-improver-plus', key: 'phase' } as const, 'idle' as Phase)
const original = atom({ plugin: 'prompt-improver-plus', key: 'original' } as const, null as string | null)
const lastDraft = atom({ plugin: 'prompt-improver-plus', key: 'lastDraft' } as const, '')
// The model suggested for the improved prompt's task, e.g. "Sonnet · refatoração simples".
const suggestion = atom({ plugin: 'prompt-improver-plus', key: 'suggestion' } as const, null as string | null)

// Only the draft is sent (never the conversation), to a small model, so each press costs little.
const MODEL = 'haiku'
const EFFORT = 'low' as const

const RULES = `You are an expert prompt engineer. Rewrite the DRAFT below into the prompt the person
should actually send to an AI agent (Claude Code).

Make it genuinely more useful, not just longer:
- Keep the person's intent, scope and LANGUAGE exactly (a draft in Portuguese stays in Portuguese).
  Never add features, goals or opinions they did not ask for; never answer or carry out the request.
- Fix spelling, grammar and vague wording. You only see the draft: where it says "it", "this" or
  "that thing" without naming what, keep the reference as written rather than inventing one.
- Open with one sentence stating the goal. Then, only where they help: relevant context, constraints,
  the concrete deliverable, and how to verify it is done.
- If something important is genuinely ambiguous, add a short line asking the agent to state its
  assumption (or ask) rather than guessing.
- Keep it proportional: a one-line question stays a short, sharper question. Bullets only for several
  distinct requirements. No headings, no preamble, no sign-off, no role-play ("You are a...").
- Write in the first person, as the person talking to the agent.

Then pick the Claude model best suited to carry out the improved prompt:
- Haiku: quick, simple, mechanical tasks (a rename, a lookup, a short answer, formatting).
- Sonnet: everyday work (most coding, edits across a few files, writing, research of moderate size).
- Opus: hard or high-stakes work (architecture, tricky debugging, large multi-step changes, deep analysis).
Give the reason in at most five words, in the draft's language.

Reply with exactly this and nothing else:
<improved_prompt>the rewritten prompt</improved_prompt>
<model>Haiku|Sonnet|Opus</model>
<reason>at most five words</reason>`

// The fixed rules go in the system prompt, marked for the prompt cache; the draft is the only message.
function ask(draft: string) {
  return {
    model: MODEL,
    system: [{ text: RULES, cache: true }],
    prompt: `<draft>\n${draft}\n</draft>`,
    maxTokens: 4000,
    effort: EFFORT,
  }
}

type Improved = { text: string; model: string | null }

function extract(reply: string): Improved | null {
  const m = reply.match(/<improved_prompt>([\s\S]*?)<\/improved_prompt>/)
  const text = (m?.[1] ?? reply.replace(/<(model|reason)>[\s\S]*?<\/>/g, '')).trim()
  if (text.length === 0) return null
  const name = reply.match(/<model>\s*(haiku|sonnet|opus)\s*<\/model>/i)?.[1]
  const why = reply.match(/<reason>([\s\S]*?)<\/reason>/)?.[1]?.trim().replace(/\s+/g, ' ').slice(0, 60)
  const model = name ? name[0]!.toUpperCase() + name.slice(1).toLowerCase() + (why ? ` · ${why}` : '') : null
  return { text, model }
}

async function improve($: EngineInterface, draft: string): Promise<Improved | null> {
  const done = await $.model.complete(ask(draft))
  if (done.isAnswered) return extract(done.text)
  throw new Error(done.reason)
}

/** The draft in the box: read it directly; fall back to what the last prompt.change carried. */
async function currentDraft($: EngineInterface): Promise<string> {
  const box = await $.prompt.read()
  if (box.text.trim().length > 0) return box.text
  return read($, lastDraft)
}

async function run($: EngineInterface): Promise<void> {
  if ((await read($, phase)) === 'working') return

  const draft = await currentDraft($)
  if (draft.trim().length === 0) {
    $.ui.toast('Digite um prompt primeiro e depois clique em ✨ Melhorar.')
    return
  }

  await update($, phase, () => 'working')

  try {
    const got = await improve($, draft.trim())
    if (got === null) {
      await update($, phase, () => 'idle')
      $.ui.toast('Nenhuma melhoria voltou; seu rascunho ficou como estava.')
      return
    }
    const now = await currentDraft($)
    if (now.trim() !== draft.trim()) {
      await update($, phase, () => 'idle')
      $.ui.toast('Você editou o rascunho enquanto eu melhorava; deixei como está.')
      return
    }

    const better = got.text
    await update($, original, () => draft)
    await update($, suggestion, () => got.model)
    const filled = await $.prompt.fill({ text: better, mode: 'replace' })
    if (filled.isFilled) {
      await update($, phase, () => 'done')
      return
    }
    // The box refused: hand the text over another way instead of losing it.
    await update($, phase, () => 'idle')
    await update($, original, () => null)
    const copied = await $.ui.copy({ text: better })
    $.ui.toast(
      copied.isCopied
        ? 'Não consegui escrever na caixa de texto; o prompt melhorado foi copiado — cole com Ctrl+V.'
        : 'Não consegui escrever na caixa de texto nem copiar o prompt melhorado.',
    )
  } catch (err) {
    await update($, phase, () => 'idle')
    $.ui.toast(`Falha ao melhorar: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function undo($: EngineInterface): Promise<void> {
  const was = await read($, original)
  if (was !== null) await $.prompt.fill({ text: was, mode: 'replace' })
  await update($, original, () => null)
  await update($, suggestion, () => null)
  await update($, phase, () => 'idle')
}

// A small square button: ✨ improves, … while working, ↩ undoes the last improvement.
async function buttons($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0]) {
  const { Box, Button, Text } = $.ui.resolve(e)
  const state = await read($, phase)
  const canUndo = (await read($, original)) !== null
  const model = state === 'done' ? await read($, suggestion) : null
  return (
    <Box flexDirection="row" alignItems="center" gap={1}>
      <Button key="improve" label={state === 'working' ? '…' : '✨'} onPress={() => run($)} />
      {canUndo && state !== 'working' && <Button key="undo" label="↩" onPress={() => undo($)} />}
      {model !== null && (
        <Text color="claude" wrap="truncate">
          {`Modelo sugerido: ${model}`}
        </Text>
      )}
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'improve',
      description: 'Melhora o texto depois de /improve e coloca o resultado na caixa de texto',
    })
    return next(e)
  })

  on('command.run', { command: 'improve' }, async ($, e) => {
    const draft = e.args.trim()
    if (draft.length === 0) return { text: 'Uso: /improve <seu prompt>. Ou digite o prompt e clique em ✨ Melhorar prompt.' }
    try {
      const got = await improve($, draft)
      if (got === null) return { text: 'Nenhuma melhoria voltou.' }
      await update($, original, () => draft)
      await update($, suggestion, () => got.model)
      const filled = await $.prompt.fill({ text: got.text, mode: 'replace' })
      await update($, phase, () => (filled.isFilled ? 'done' : 'idle'))
      const tip = got.model ? `
Modelo sugerido: ${got.model}` : ''
      return { text: (filled.isFilled ? 'O prompt melhorado está na caixa de texto: revise e envie.' : got.text) + tip }
    } catch (err) {
      return { text: `Falha ao melhorar: ${err instanceof Error ? err.message : String(err)}` }
    }
  })

  on('prompt.change', async ($, e, next) => {
    await update($, lastDraft, () => e.text)
    // A submit, a clear or the person's own edit ends the "improved" state.
    if (e.origin.kind !== 'plugin' && (await read($, phase)) === 'done') {
      if (e.origin.kind === 'clear' || e.text.trim().length === 0) await update($, original, () => null)
      await update($, phase, () => 'idle')
    }
    return next(e)
  })

  // Its own row: shown alone only where no other mod draws in the band (see AbovePromptList below).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" paddingX={1}>
        {await buttons($, e)}
      </Box>
    )
  })

  // Wrap the whole band: the button on the left, the other mods' rows (usage-meter's) beside it on the
  // same line. Independent of the order the mods load in.
  on('ui.render', { component: 'AbovePromptList' }, async ($, e, next) => {
    const others = e.props.rows.filter(r => r.plugin !== 'prompt-improver-plus')
    if (e.props.hasSurvey || others.length === 0) return next(e)
    const band = await next({ ...e, props: { ...e.props, rows: others } })
    const { Box } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        {await buttons($, e)}
        {band}
      </Box>
    )
  })
}
