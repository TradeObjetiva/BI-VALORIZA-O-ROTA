# BI Valorização & Trade Intelligence

Sistema avançado de BI e Inteligência de Trade Marketing para análise de valorização de promotores, eficiência em R$/hora, custo por visita e simulações com IA.

---

## 🚀 Como Rodar Localmente

1. Instale as dependências:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra no navegador em: `http://localhost:3000`

---

## 📦 Como Fazer o Build de Produção

```bash
npm run build
```
Os arquivos otimizados para produção serão gerados na pasta `dist/`.

---

## 🌐 Deploy na Vercel

O projeto já contém o arquivo `vercel.json` configurado para Vite e com compatibilidade total de dependências:
- **Build Command:** `npm run build`
- **Install Command:** `npm install --legacy-peer-deps`
- **Output Directory:** `dist`

Basta importar o repositório na [Vercel](https://vercel.com) e clicar em **Deploy**.
