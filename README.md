# Church Finance

Gestor financeiro e da diaconia da Sexta Igreja Presbiteriana de Guarulhos.
HTML + Tailwind (CDN) + JavaScript (módulos ES) + Firebase Auth e Realtime Database.

> **Etapa 1 de 3 — perfis, menu vertical e usuários.**
> Etapa 2: Diaconia (patrimônio e termo de empréstimo). Etapa 3: Tesouraria (contas a pagar,
> recibos e doações, fechamento mensal, exportação em PDF/Excel).

## Estrutura

```
public/                  ← pasta publicada no Firebase Hosting
  login.html             login (não usa guard)
  index.html             início, com atalhos conforme o perfil
  generate.html          nova contagem / editar         (?id=<id> para editar)
  signature.html         conferentes                    (?id=<id> assinar | ?view=<id> só leitura)
  reports.html           histórico de contagens, busca e filtros
  dashboard.html         indicadores (Tesouraria e ADM)
  usuarios.html          usuários e perfis (somente ADM)
  404.html  favicon.svg  style.css
  js/
    firebase-init.js     ÚNICO ponto de inicialização do Firebase (versão do SDK fica aqui)
    permissions.js       perfis e o que cada um pode fazer na tela
    layout.js            guarda de sessão + menu vertical (NAV) + cabeçalho + rodapé
    utils.js             R$, datas, toast, modal de confirmação, helper DOM seguro
    tailwind-config.js   paleta de cores do tema
    index.js login.js generate.js reports.js signature.js dashboard.js usuarios.js
database.rules.json      regras do Realtime Database (por perfil)
```

Se o seu `firebase.json` aponta para outra pasta em `"public"`, ajuste o caminho.
Mantenha `database.rules.json` **fora** da pasta publicada.

## Layout

Menu **vertical** com um grupo por módulo (Diaconia, Tesouraria, Administração); cada pessoa só vê os
itens do seu perfil. O cabeçalho horizontal tem apenas o usuário logado e o botão **Sair**
(no celular aparece também o botão que abre o menu). Para adicionar uma tela ao menu,
inclua uma linha em `NAV` no `js/layout.js`.

## Perfis

| Perfil                | Contagens de culto                                                              | Dashboard | Usuários |
|-----------------------|---------------------------------------------------------------------------------|:---------:|:--------:|
| **ADM**               | tudo (inclusive editar/excluir relatórios já recebidos)                         |    ✅     |    ✅    |
| **Diácono master**    | ver todas, criar, editar, assinar e excluir — enquanto **não** forem RECEBIDAS  |    ❌     |    ❌    |
| **Diácono conferente**| criar e assinar (conferentes) as **que ele criou**, enquanto PENDENTES; só vê as próprias; não altera nem exclui | ❌ | ❌ |
| **Tesoureiro master** | ver todas e mudar o **status** (PENDENTE / RECEBIDO / DIVERGENTE)               |    ✅     |    ❌    |
| **Tesoureiro consulta**| somente ver                                                                    |    ✅     |    ❌    |

As regras são aplicadas **no servidor** (`database.rules.json`); a tela apenas esconde o que a pessoa não pode usar.
Se mudar uma permissão, altere `js/permissions.js` **e** as regras.

## Primeiro uso desta versão

1. **Publique as regras** (veja abaixo) **só depois** de confirmar que existe pelo menos um usuário ADM ou MASTER em `users/`.
2. Entre com o usuário que hoje é **MASTER**. Ele já enxerga a tela **Usuários** (perfis antigos continuam valendo).
3. Em **Usuários**, clique em **Converter perfis antigos**: MASTER → ADM e CONFERENTE → Diácono conferente.
4. Ajuste o perfil de cada pessoa (ex.: quem é tesoureiro) e crie os demais usuários em **Novo usuário**.

Usuários criados pela tela ficam em *Authentication* e em `users/<UID>` com `nome`, `email`, `role`, `ativo`.
O primeiro ADM/MASTER continua sendo criado pelo console (*Authentication → Users*, depois o nó `users/<UID>`
com `{ "nome": "...", "role": "ADM" }`).

## Publicar as regras

```bash
firebase deploy --only database
```

No `firebase.json`: `{ "database": { "rules": "database.rules.json" } }`.
Ou cole o conteúdo em *Console Firebase → Realtime Database → Regras*.

**Teste antes em homologação**, usando o *Simulador de regras* do console e entrando com um usuário de cada perfil.
As expressões das regras foram verificadas com 69 cenários automáticos (perfil × ação), mas **não** foram executadas no emulador do Firebase.

Observações das regras:
- Diácono conferente lê a lista com uma consulta por `criadoPor` (índice `.indexOn` já incluído). Relatórios antigos, sem `criadoPor`, não aparecem para ele.
- Relatórios antigos sem `status` contam como PENDENTE.
- As regras ainda aceitam os perfis antigos MASTER/CONFERENTE até a conversão; depois dela, esses valores podem ser removidos de `database.rules.json`.

## Rodar localmente (VSCode / ChromeOS)

```bash
cd public
python3 -m http.server 5000     # ou: npx serve .  /  extensão Live Server
```

Adicione `localhost` em *Authentication → Settings → Authorized domains*, se ainda não estiver.

## Antes de ir para produção

- Restrinja a API key aos seus domínios (Google Cloud → Credenciais → Restrições de sites).
- Ative o **App Check** (opcional, recomendado).
- Cada projeto Firebase (homologação/produção) tem o próprio banco, usuários e regras: repita os passos acima em cada um
  e use o `firebaseConfig` do respectivo projeto em `js/firebase-init.js`.

## Opcional: compilar o Tailwind

O CDN funciona, mas não é recomendado para produção. Quando quiser: `npm i -D tailwindcss`, mover o conteúdo de
`js/tailwind-config.js` para `tailwind.config.js`, gerar `public/tailwind.css` com a CLI e trocar os dois
`<script>` do CDN por `<link rel="stylesheet" href="tailwind.css">`.
