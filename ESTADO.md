# Lyriq — estado do projeto e o que falta

Documento de acompanhamento. Última atualização: 26/jul/2026 (revisão do projeto,
com acertos de modo de treino, `PRODUCT.md` e screenshots).

---

## Resumo em uma linha

Fases 1 e 2 e os acertos de 26/jul estão **commitados, no GitHub e no ar**. Nada
pendente no código — o que resta são decisões de produto (Fases 3 e 4) e a dívida
de teste automatizado.

---

## Onde está publicado

| Item | Valor |
| --- | --- |
| Endereço público | https://lyriq-learn.vercel.app |
| Projeto na Vercel | `lyriq` (conta `cauaprjcts-projects`) |
| Deploy | Vercel CLI (`vercel --prod`), autenticada como `cauaprjct` |
| Último deploy | 26/jul/2026 — acertos do modo de treino, bundle `index-CQExtR1N.js` (o anterior, da Fase 2, era `index-xFrh9wDz.js`) |

Detalhes que valem lembrar:

- **`lyriq.vercel.app` não está disponível** — pertence a outra conta. Testado, dá
  "already in use". O endereço em uso (`lyriq-learn`) é o que já constava no
  README original.
- **`ritmo-pompeii.vercel.app` é o mesmo projeto**, apenas com o domínio antigo
  ainda anexado. Hoje os dois endereços servem o site novo. Para aposentar o
  antigo, remova o domínio em Settings → Domains — **não apague o projeto**.
- O projeto tem **Deployment Protection** ativa: previews pedem login, só o
  domínio de produção é público. Foi por isso que `lyriq-learn` precisou ser
  promovido a domínio de produção.

---

## Git

| Item | Valor |
| --- | --- |
| Repositório | https://github.com/cauaprjct/lyriq |
| Último commit | `086126f` — `PRODUCT.md` e screenshots atualizados, mais o commit deste documento |
| Anteriores | `8a025e8` (persistência do modo), `ee073c1` (README), `6dcff32` (este documento), `3d99a39` (Fase 2), `a80edee` (arrumação do `.gitignore`), `a5efaba` (Fase 1), `7c3a61b` (analytics), `d0e882f` (commit inicial) |
| Branch | `main`, empurrada para `origin/main` (`ee073c1..086126f`) |

Só `8a025e8` mexe em código; `086126f` e este documento são documentação e
imagens.

⚠️ **O git desta máquina não tem identidade configurada** (`user.name` /
`user.email`). Todos os commits até aqui foram feitos passando a identidade só no
comando (`git -c user.name=cauaprjct -c user.email=cauaprjct@users.noreply.github.com`),
para não alterar a configuração da máquina e manter o histórico consistente.
Se preferir configurar de vez, é decisão sua.

⚠️ **Correção de um registro anterior deste documento:** até 26/jul a Fase 1
(`a5efaba`) existia só nesta máquina — o `origin/main` ainda estava em `7c3a61b`.
O push foi feito junto com a Fase 2, então hoje as duas estão no GitHub.

---

## Fase 1 — pronta, no ar (commit `a5efaba`)

Além do karaokê, esse commit carrega o catálogo, o progresso local e o branding.

**O que entrega**

- Catálogo inicial com 10 músicas e filtro por nível, em vez de abrir numa única
  música fixa. Guarda apenas metadados (artista, título, id do vídeo) — a letra é
  buscada na hora, nunca fica no repositório.
- Progresso por música (precisão e tentativas) salvo no navegador.
- **Karaokê:** troca do iframe simples pela YouTube IFrame API, para conhecer o
  tempo de reprodução, mais letra com marcação de tempo vinda do LRCLIB através da
  função `/api/synced`. O verso atual fica destacado e acompanha o vídeo, dá para
  clicar num verso para pular até ele, os parágrafos são inferidos pelos intervalos
  de tempo e existe um botão para ouvir o verso que está sendo escrito.
- Ajuste de sincronia (±0,5s, até 15s) para vídeos cuja introdução difere da
  versão de estúdio.
- Música sem letra sincronizada continua funcionando: o vídeo toca normal.
- Branding Lyriq: nome, favicon, metadados de compartilhamento e imagem OG.

**Arquivos principais**

```
api/synced.js                     proxy do LRCLIB (get + search)
src/lib/lrc.ts                    parse de LRC, linha ativa, parágrafos por gap
src/hooks/useYouTubePlayer.ts     IFrame API; tempo entregue por subscribe
src/components/SyncedLyrics.tsx   painel do karaokê
src/components/MediaPanel.tsx     player + letra + ajuste de sincronia
src/data/catalog.ts               catálogo (só metadados)
src/lib/progress.ts               progresso no navegador
```

---

## Fase 2 — pronta, no ar (commit `3d99a39`)

**O que entrega**

1. **Tamanho do trecho: frase ou parágrafo.**
   - Frase: um verso por vez (comportamento anterior).
   - Parágrafo: escreve o bloco inteiro; `Enter` quebra linha e `Ctrl/Cmd+Enter`
     confere.
   - A divisão respeita os intervalos da própria música. Para isso a API passou a
     **preservar as linhas em branco** da letra, que antes eram descartadas.
     Sem esses intervalos, agrupa de 4 em 4 e limita blocos muito longos.
   - A escolha mostra o efeito na hora ("Um parágrafo por vez — 9 trechos").

2. **Ritmo: meu ritmo ou acompanhar a música.**
   - Meu ritmo: você decide quando ouvir e quando escrever.
   - Acompanhar a música: cada trecho toca sozinho e **para no fim**, esperando a
     escrita. Alternável durante o treino por um botão no cabeçalho.
   - Sem letra sincronizada, avisa e segue no seu ritmo.
   - Efeito colateral bem-vindo: "ouvir este trecho" agora toca só o trecho.

3. Preferências salvas no navegador (`localStorage`, chave `lyriq.prefs.v1`) e
   restauradas ao recarregar.

**Arquivos tocados**

```
api/song.js            preserva linhas em branco como separador de parágrafo
src/types.ts           Chunk, Pace, Prefs
src/lib/prefs.ts       (novo) padrões + load/save defensivos
src/lib/lyrics.ts      textToBlocks, flattenBlocks, stripFiller; buildItems recebe blocos
src/lib/lrc.ts         nextLineTime, findVerseSpan (início e fim do trecho)
src/screens/Setup.tsx  UI das preferências
src/screens/Trainer.tsx  digitação em bloco, auto-play, auto-pause, botão de ritmo
src/App.tsx            preferências na sessão
src/styles.css         .prefs, .segmented--sm, .pace-btn, .prompt--block, .alert--tight
```

**Como foi verificado** (dev local com proxy temporário para produção, já revertido)

- Auto-pause medido em números: trecho de 35,66s a 55,42s; a reprodução parou em
  **55,48s** e não avançou mais.
- Auto-play ao trocar de trecho: próximo trecho 55,42→82,48s, tempo avançando
  3,01s em 3s.
- A contagem de trechos vem das quebras da música: 9 trechos com separador a cada
  5 versos, contra 11 do agrupamento automático de 4.
- `Enter` quebra linha sem conferir; `Ctrl+Enter` corrige e mostra o resultado.
- Botão de ritmo gravou `pace:"self"` e, ao pular, a música não se mexeu sozinha.
- Preferências sobreviveram ao recarregamento da página.
- Zero erros de console. Build limpo (`tsc && vite build`, bundle
  `dist/assets/index-xFrh9wDz.js`).

**Verificado no deploy de 26/jul**

- Build reproduzido do zero (`npm ci` + `npm run build`): `tsc` e `vite` saíram com
  código 0, 402 módulos, mesmo bundle `index-xFrh9wDz.js`. O build da Vercel gerou
  o mesmo hash — o que está no ar é o que foi testado.
- Produção responde: home em HTTP 200 servindo `assets/index-xFrh9wDz.js` (antes
  era `index-Cgt0EEjV.js`, da Fase 1), e as duas funções em HTTP 200 —
  `/api/synced` e `/api/song`, essa última a que mudou.

---

## Acertos de 26/jul — commitados e no ar

Revisão do projeto contra o que estava documentado. Três achados de documentação e
um de comportamento.

### 1. O modo de treino não era lembrado (código, `8a025e8`)

O "Modo" (tradução/ditado) era estado local do `Setup`, então voltava para
tradução a cada recarregamento, enquanto tamanho do trecho e ritmo eram
restaurados. O README anunciava os três lado a lado, como se funcionassem igual.

Agora `mode` faz parte de `Prefs` e é gravado junto dos outros dois. Em vez de
deixar o valor em dois lugares, o modo saiu da assinatura da sessão: `Trainer` lê
`prefs.mode`, então existe uma fonte única.

```
src/types.ts           mode entra em Prefs
src/lib/prefs.ts       MODES, padrão "translate", validação defensiva no load
src/screens/Setup.tsx  mode vem de prefs; o toggle grava via updatePrefs
src/screens/Trainer.tsx  lê prefs.mode; prop `mode` removida
src/App.tsx            Session não carrega mais mode
```

**Como foi verificado** (dev local com o proxy temporário para produção, já revertido)

- Trocar para Ditado gravou `{"mode":"dictation","chunk":"line","pace":"self"}`; ao
  recarregar, Ditado seguia marcado.
- Preferências no formato antigo (`{chunk:"block",pace:"song"}`, sem `mode`, que é
  o que usuários atuais têm sob a mesma chave) carregam sem quebrar: modo cai no
  padrão e trecho/ritmo são preservados. A chave `lyriq.prefs.v1` não precisou de
  bump.
- Valores inválidos escritos à mão caem todos nos padrões.
- Ditado abre com a dica de ouvido e monta o player; tradução abre sem cair na
  dica de ditado. Os dois caminhos foram exercitados porque a assinatura de
  `onStart` mudou.
- Build limpo: `tsc -b && vite build`, 402 módulos, bundle `index-CQExtR1N.js`.
- Sem erros de console do app. O embed do YouTube gera dois erros de requisição de
  anúncio (doubleclick) bloqueada no ambiente de teste — não são do app.

**Verificado em produção depois do deploy**

- A Vercel gerou o mesmo bundle do build local, `index-CQExtR1N.js` — o que está no
  ar é o que foi testado aqui.
- Home em HTTP 200 servindo esse bundle; `/api/song` e `/api/synced` em HTTP 200.
- O fix conferido no site publicado: trocar para Ditado gravou
  `{"mode":"dictation","chunk":"line","pace":"self"}` e, ao recarregar, Ditado
  seguia marcado.

### 2. `PRODUCT.md` estava desatualizado (documentação, `086126f`)

Descrevia o produto como "um treinador focado em uma única música (Pompeii)", de
antes do catálogo. Reescrito para o produto atual: 10 músicas por nível mais
qualquer link do YouTube, as três preferências de treino e a escolha de idioma da
dica. Ganhou também uma seção "Privacy stance", porque "nada sai do navegador" hoje
é posição de produto e não só detalhe de implementação — é justamente o que a Fase
3 pressiona. O princípio "One song, done exceptionally" saiu: o produto não é mais
isso.

O `DESIGN.md` é da mesma época e continua valendo — a paleta brasa/cinza e o par
Fraunces + Inter são o que está no CSS.

### 3. As screenshots do README eram da interface antiga (documentação, `086126f`)

`screenshots/home.png` e `trainer.png` eram do commit inicial, anteriores ao
catálogo e às preferências. Recapturadas em 1280px:

- `home.png` — catálogo com os 10 cards, filtro por nível e o campo de link.
- `trainer.png` — a correção palavra por palavra com os quatro tipos de marcação
  (acerto, erro, falta, sobra), usando a demo embutida, que não depende de rede.

O card de "Believer" aparece com um bloco verde. Foi checado: o defeito está no
frame que o YouTube serve para aquele vídeo, em todas as resoluções
(`hqdefault`, `mqdefault`, `sddefault`, `maxresdefault`, 34% a 47% de pixels
verdes). Não é do nosso render, e a captura ficou fiel ao que o usuário vê.

### 4. Este documento apontava um commit velho (documentação)

Registrava `3d99a39` como último commit, quando já havia `6dcff32` e `ee073c1`
depois. Corrigido acima.

---

## O que falta

### Imediato

Nada no código. Fases 1 e 2 e os acertos de 26/jul estão commitados, no GitHub e
publicados.

Opcional: aposentar o domínio `ritmo-pompeii.vercel.app` em Settings → Domains
(remover só o domínio, **não apagar o projeto**).

### Dívida conhecida

Não existe teste automatizado: `package.json` tem só `dev`, `build` e `preview`.
Toda a verificação registrada aqui foi manual — é boa, com números, mas ninguém
a repete sozinho. Vale decidir se entra um `vitest` para as partes puras
(`diff.ts`, `lrc.ts`, `lyrics.ts`, `prefs.ts`), que é onde um erro silencioso
custaria mais.

### Fases seguintes (dependem de decisão sua)

- **Fase 3 — contas (Supabase).** Sincronizar progresso entre aparelhos. Implica
  backend, autenticação e privacidade. Hoje o app não guarda nada fora do
  navegador, o que é parte do discurso atual — vale decidir se isso muda.
- **Fase 4 — missões e ligas.** Falta decidir o quanto gamificar. Existe uma
  tensão real com o tom "anti-Duolingo" da marca: sequências e rankings podem
  brigar com a proposta de treinar sem pressão.

---

## Limitações conhecidas

- **Sincronia da letra:** o LRC é cronometrado pela versão de estúdio. Em clipes
  com introdução mais longa a letra adianta — daí o ajuste manual (±15s cobre os
  casos vistos). Em vídeos "lyric"/áudio o desvio é mínimo.
- **Autoplay:** numa página recém-aberta, o navegador pode engolir o primeiro
  comando de tocar (política de autoplay). Existe uma segunda tentativa 400ms
  depois; o problema não se repetiu, mas só o uso real confirma.
- **Não é possível ler o áudio do YouTube** (iframe de outra origem). Os
  parágrafos vêm dos intervalos de tempo do LRC, não de análise de onda sonora.
- **Casamento verso ↔ letra sincronizada** depende de as duas fontes (provedor da
  letra e LRCLIB) escreverem o verso de forma parecida. Quando a última linha de
  um bloco não casa, o fim do trecho é estimado contando linhas.

---

## Rodar e testar localmente

```
cd RITMO
npm run dev          # interface
npm run build        # tsc + vite build
```

As funções em `api/` **não rodam** no `vite dev`. Para testar buscas e letra
sincronizada localmente, aponte `/api` temporariamente para a produção no
`vite.config.ts`:

```ts
server: {
  proxy: { "/api": { target: "https://lyriq-learn.vercel.app", changeOrigin: true } },
}
```

Reverta esse proxy antes de commitar — ele existe só para teste local.
Alternativa sem proxy: `vercel dev`, que roda as funções junto (assim a mudança
das linhas em branco em `api/song.js` também vale localmente).
