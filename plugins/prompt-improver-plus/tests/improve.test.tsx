import { expect, test } from 'claude-code/testing'

const HINT = {
  plugin: 'prompt-improver-plus',
  component: 'AbovePrompt',
  props: { hasSurvey: false },
} as const

for (const [surface, readsBox] of [
  ['terminal', true],
  ['desktop', true],
  // A host whose $.prompt.read() answers empty: the draft comes from prompt.change instead.
  ['desktop', false],
] as const) {
  test(`button under the prompt replaces the draft (${surface}, read ${readsBox ? 'works' : 'empty'})`, async ($, on) => {
    const filled: string[] = []
    let box = ''
    on('ui.render', ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>engine hint</Text>
    })
    on('prompt.change', (_, e) => {
      box = e.text
      return { text: e.text, cursor: e.cursor }
    })
    on('prompt.read', () => ({ value: { text: readsBox ? box : '', cursor: 0 } }))
    const sent: { model: string; prompt: string; system?: string }[] = []
    on('model.fork', () => {
      throw new Error('the conversation must not be forked')
    })
    on('model.complete', (_, e) => {
      sent.push({ model: e.model, prompt: e.prompt, system: e.system })
      return { value: { isAnswered: true, text: '<improved_prompt>Prompt melhorado</improved_prompt><model>sonnet</model><reason>edição simples</reason>' } }
    })
    on('prompt.fill', (_, e) => {
      filled.push(e.text)
      box = e.text
      return { isFilled: true }
    })

    await $.prompt.change({ text: 'arruma isso ai', cursor: 14, origin: { kind: 'typed' } } as never)

    const ui = await $.ui.mount({ ...HINT, surface })
    void 0
    await ui.press({ key: 'improve' })
    expect(filled).toEqual(['Prompt melhorado'])
    expect(sent).toHaveLength(1)
    expect(sent[0]!.model).toBe('haiku')
    expect(sent[0]!.prompt).toBe('<draft>\narruma isso ai\n</draft>')
    expect(sent[0]!.system).toContain('expert prompt engineer')
    expect(await ui.find({ key: 'undo' })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /Modelo sugerido/ }))?.text).toBe('Modelo sugerido: Sonnet · edição simples')
    await ui.press({ key: 'undo' })
    expect(filled).toEqual(['Prompt melhorado', 'arruma isso ai'])
    await ui.unmount()
  })
}

