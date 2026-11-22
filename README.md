# prompt-improver-plus

Mod do Claude Code que adiciona um botão **✨ Melhorar prompt** logo abaixo da caixa de texto. Você digita um rascunho, clica no botão e o texto da caixa é substituído por uma versão mais clara e específica, no mesmo idioma e com a mesma intenção. Ele também sugere qual modelo (Haiku, Sonnet ou Opus) combina com a tarefa.

Funciona no app desktop e no terminal.

## Como usar

1. Digite o rascunho na caixa de texto do Claude Code.
2. Clique em **✨**. O botão mostra **…** enquanto trabalha.
3. Revise o texto novo e envie. A sugestão de modelo aparece ao lado do botão (por exemplo, `Modelo sugerido: Sonnet · refatoração simples`).
4. Clique em **↩** para voltar ao rascunho original.

Também há o comando `/improve <seu prompt>`, que coloca o resultado na caixa de texto.

## Instalação

No Claude Code (versão 2.1.275 ou mais nova):

```
/plugin install prompt-improver-plus --marketplace allanhermann/prompt-improver-plus
```

Reinicie a sessão depois de instalar.

## Consumo do limite

Cada clique faz **uma única chamada** ao modelo Haiku com esforço baixo. Só o rascunho é enviado: o histórico da conversa não vai junto, então o custo é pequeno e não cresce com o tamanho da sessão. As regras fixas do mod vão no prompt de sistema, marcadas para o cache de prompt.

Como o mod não vê a conversa, referências vagas como "isso" ou "aquele arquivo" são mantidas como você escreveu, sem adivinhar a que se referem.

## Privacidade

O mod usa apenas o seu login do Claude Code. Não acessa a rede por conta própria, nem arquivos ou variáveis de ambiente.

## Estrutura

```
.claude-plugin/marketplace.json        catálogo (marketplace) com o mod
plugins/prompt-improver-plus/
  .claude-plugin/plugin.json           manifesto e versão
  hooks/register.tsx                   botão, comando /improve e chamada ao modelo
  tests/improve.test.tsx               testes
  types/index.d.ts                     tipos dos valores guardados pelo mod
```

## Desenvolvimento

```
claude plugin validate plugins/prompt-improver-plus
claude plugin test plugins/prompt-improver-plus
```

Os testes conferem, entre outras coisas, que só o rascunho é enviado ao modelo e que nenhuma tag `<improved_prompt>` sobra na caixa de texto quando o modelo erra o formato da resposta.

## Créditos e licença

Baseado em [AndrewStrong615/prompt-improver](https://github.com/AndrewStrong615/prompt-improver) (MIT). Licença MIT, em [plugins/prompt-improver-plus/LICENSE](plugins/prompt-improver-plus/LICENSE).
