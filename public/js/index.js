// index.js — página inicial: atalhos conforme o perfil
import { initProtectedPage, navFor } from "./layout.js";
import { h } from "./utils.js";

const { profile } = await initProtectedPage({ active: "home" });

const firstName = String(profile.nome).split(" ")[0];
document.getElementById("welcome").textContent = `Olá, ${firstName}!`;

const links = navFor(profile.role).filter((item) => item.key !== "home");
document.getElementById("quickLinks").replaceChildren(
  ...links.map((item) =>
    h(
      "a",
      {
        href: item.href,
        class:
          "block rounded-xl border border-edge bg-surface p-5 transition hover:border-mint hover:bg-field",
      },
      h("p", { class: "text-xs font-bold uppercase tracking-wider text-muted", text: item.group || "" }),
      h("p", { class: "mt-1 text-lg font-bold", text: item.label })
    )
  )
);
