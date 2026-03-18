# Por que `/admin` (ou o site) não atualiza após deploy?

## Causa típica
O **index.html** fica em **cache** (browser, Cloudflare, Nginx). Ele aponta para ficheiros `assets/index-XXXX.js` **antigos**. Novo código está em **hashes novos**, mas o browser nunca pede o HTML novo.

## O que o projeto faz
Cada `npm run deploy` grava em `dist/index.html` um meta único:

```html
<meta name="cacamba-deploy-id" content="2026-03-18T12:00:00.000Z" />
```

No servidor, depois do deploy:

```bash
grep cacamba-deploy-id /www/wwwroot/pedircacamba.com/index.html
```

No teu PC (substitui o domínio):

```bash
curl -s https://pedircacamba.com/ | grep cacamba-deploy-id
```

Se a data no **servidor** for nova mas no **curl** for velha → **cache** (CDN/browser).

## Nginx (recomendado)
Não fazer cache longo do `index.html`:

```nginx
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    add_header Pragma "no-cache";
}
```

Os ficheiros em `/assets/*` podem ter `Cache-Control: public, max-age=31536000, immutable` (têm hash no nome).

## Depois de subir `dist/`
1. Confirma que **todo** o conteúdo de `dist/` foi copiado (incluindo **index.html** e pasta **assets/**).
2. Janela anónima ou Ctrl+F5 no `/admin`.
