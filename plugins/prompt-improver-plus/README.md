# prompt-improver-plus

Adiciona um botão **✨ Melhorar prompt** logo abaixo da caixa de texto do Claude Code (app desktop e terminal). Ao clicar, o mod lê o rascunho digitado na caixa, envia só o rascunho (sem o histórico da conversa) ao Haiku, com esforço baixo e as regras fixas marcadas para o cache de prompt, pedindo que o reescreva de forma mais clara e específica, mantendo o idioma e a intenção, e substitui o texto da caixa pelo prompt melhorado. **↩ Desfazer** volta ao rascunho original. Também há o comando `/improve <texto>`.

Usa apenas o seu próprio login do Claude Code; não acessa a rede, arquivos nem variáveis de ambiente.

Baseado em [AndrewStrong615/prompt-improver](https://github.com/AndrewStrong615/prompt-improver) (MIT).

## Instalação

`/plugin install prompt-improver-plus --marketplace allanhermann/prompt-improver-plus`
