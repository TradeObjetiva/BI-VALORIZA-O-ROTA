# BI Valorização & Trade Intelligence

Dashboard executivo para análise de valorização de promotores, redes, regiões, custo por visita, eficiência em R$/hora e simulações financeiras.

A planilha é processada no navegador. A última base carregada fica salva localmente (IndexedDB) e **não é enviada para o GitHub**.

## Requisitos

- Node.js 20 ou superior
- npm

## Como rodar

```bash
npm install --legacy-peer-deps
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Preview do build |
| `npm run lint` | Checagem TypeScript |

## IA (opcional)

Copie `.env.example` para `.env` e preencha `GEMINI_API_KEY` se quiser o parecer gerado pelo Gemini. Sem a chave, o sistema usa o diagnóstico local.

Não versione o arquivo `.env`.

## Publicar no GitHub Pages

O workflow em `.github/workflows/deploy.yml` publica o build em Pages a cada push em `main`.

1. Crie o repositório no GitHub e envie o código.
2. Em **Settings → Pages**, defina a origem como **GitHub Actions**.
3. Confira o endereço gerado após o workflow concluir.

O projeto já usa `base: './'` no Vite, adequado para Pages em repositório de projeto.

## Privacidade

Não faça commit de planilhas `.xlsx` / `.xls` / `.csv` com dados reais de clientes. O `.gitignore` já bloqueia esses arquivos.
