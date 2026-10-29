// utils.js — funções compartilhadas por todas as páginas

export const STATUS = ["PENDENTE", "RECEBIDO", "DIVERGENTE"];

/* ---------- Dinheiro ---------- */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1500 -> "R$ 1.500,00" */
export const formatBRL = (value) => brl.format(Number(value) || 0);

/**
 * Converte o valor digitado (ex.: "12.35") em centavos inteiros.
 * Somar centavos evita erros de ponto flutuante (0.1 + 0.2).
 */
export const toCents = (value) => Math.round((parseFloat(value) || 0) * 100);

/* ---------- Datas ---------- */

export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

/** Devolve "AAAA-MM-DD" no fuso local (para <input type="date">). */
export function toDateInputValue(value = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "AAAA-MM-DD" -> ISO ao meio-dia local. Meio-dia evita que o fuso horário
 * empurre a data para o dia anterior/seguinte ao exibir.
 */
export function dateInputToISO(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

/* ---------- DOM seguro (sem innerHTML com dados do usuário) ---------- */

/**
 * h("a", { href: "x", class: "...", onclick: fn }, "texto", outroNo)
 * Textos entram sempre como texto puro, nunca como HTML.
 */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Minúsculas e sem acentos, para busca. */
export const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* ---------- Feedback ao usuário ---------- */

let toastRoot;

/** Aviso temporário no rodapé da tela. type: "info" | "success" | "error" */
export function toast(message, type = "info", duration = 4500) {
  if (!toastRoot) {
    toastRoot = h("div", {
      class:
        "fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col items-center gap-2 pointer-events-none",
      "aria-live": "polite",
    });
    document.body.append(toastRoot);
  }
  const colors = {
    info: "bg-field text-white",
    success: "bg-accent text-canvas",
    error: "bg-red-600 text-white",
  };
  const node = h("div", {
    role: type === "error" ? "alert" : "status",
    class: `pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${colors[type] || colors.info}`,
    text: message,
  });
  toastRoot.append(node);
  setTimeout(() => node.remove(), duration);
}

/** Substitui window.confirm. Devolve uma Promise<boolean>. */
export function confirmDialog(message, { confirmText = "Confirmar", cancelText = "Cancelar", danger = false } = {}) {
  return new Promise((resolve) => {
    const btn = "rounded-full px-5 py-2 text-sm font-bold transition";
    const dialog = h(
      "dialog",
      { class: "m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-edge bg-surface p-6 text-white backdrop:bg-black/60" },
      h("p", { class: "mb-6 text-base", text: message }),
      h(
        "div",
        { class: "flex justify-end gap-3" },
        h("button", {
          type: "button",
          class: `${btn} bg-field text-white hover:bg-edge`,
          text: cancelText,
          onclick: () => dialog.close("cancel"),
        }),
        h("button", {
          type: "button",
          autofocus: true,
          class: `${btn} ${danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-accent text-canvas hover:brightness-95"}`,
          text: confirmText,
          onclick: () => dialog.close("ok"),
        })
      )
    );
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "ok");
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

/** Mensagens de login em português, sem expor texto técnico do Firebase. */
export function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-disabled":
      return "Este usuário está desativado. Fale com o administrador.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/email-already-in-use":
      return "Já existe um usuário com este e-mail.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/network-request-failed":
      return "Sem conexão. Verifique sua internet e tente novamente.";
    default:
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}
