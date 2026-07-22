# Lyriq

Aprenda inglês escrevendo as músicas que você ama. Cole o link de uma música do
YouTube, o app descobre a faixa, busca a letra e a tradução, e te desafia a
digitar cada verso em inglês, com correção **palavra por palavra**.

**Demo ao vivo:** https://lyriq-learn.vercel.app

![Tela inicial do Lyriq](screenshots/home.png)
![Correção palavra por palavra](screenshots/trainer.png)

## Como funciona

1. Cole uma URL do YouTube (ou use o demo com "Pompeii", do Bastille).
2. O app resolve artista/música pelo oEmbed do YouTube e busca a letra.
3. Você revisa e edita a letra e a tradução antes de começar — nada é armazenado.
4. Treine em dois modos:
   - **Tradução** — a dica aparece no seu idioma e você escreve o verso em inglês.
   - **Ditado** — toque a música, ouça e escreva de ouvido, sem tradução.
5. Cada tentativa é corrigida palavra por palavra (acertou / errou / faltou / sobrou),
   com sequência de acertos, precisão e um resumo no fim.

A correção usa um alinhamento por LCS (maior subsequência comum) para casar as
palavras digitadas com as esperadas, então ela entende inserções, omissões e
trocas — não é uma comparação posição a posição.

## Stack

- **React 18 + TypeScript + Vite** no front-end
- **Framer Motion** para as transições
- **Funções serverless na Vercel** (`/api/song`, `/api/translate`) para evitar CORS
  e manter tudo sem chave de API
- Sem back-end próprio; letras via [lyrics.ovh](https://lyrics.ovh) e tradução via
  [MyMemory](https://mymemory.translated.net)

## Rodando localmente

```bash
npm install
npm run dev          # front-end (as funções /api precisam da Vercel)
# ou, para rodar front + funções juntos:
vercel dev
```

Build de produção:

```bash
npm run build
```

## Estrutura

```
api/            Funções serverless (song, translate)
src/
  screens/      Setup (buscar/revisar) e Trainer (treino)
  components/   Feedback, Results, ListenPanel
  hooks/        useTrainer (estado do treino)
  lib/          diff (correção), api (fetch), lyrics (helpers)
  data/         demo (Pompeii, embutido)
PRODUCT.md      Decisões de produto
DESIGN.md       Sistema visual
```

## Observações

As fontes gratuitas de letra e tradução são ótimas para um projeto assim, mas não
cobrem toda música e a tradução automática às vezes é literal — por isso a tela de
revisão é parte central do fluxo. As letras pertencem aos seus respectivos autores;
o Lyriq apenas as exibe para prática pessoal e não armazena nada.

## Licença

MIT
