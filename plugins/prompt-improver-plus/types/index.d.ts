export type Phase = 'idle' | 'working' | 'done'

declare module 'claude-code' {
  interface PluginState {
    'prompt-improver-plus': {
      phase: Phase
      /** The draft as it was before the last improvement, for Undo. */
      original: string | null
      /** The draft as the last prompt.change saw it: a fallback where $.prompt.read() answers empty. */
      lastDraft: string
      /** The model suggested for the improved prompt's task, with a short reason. */
      suggestion: string | null
    }
  }
}
