// dashboard.js — indicadores a partir dos relatórios reais
import { db, ref, onValue } from "./firebase-init.js";
import { initProtectedPage } from "./layout.js";
import { h, formatBRL, formatDate } from "./utils.js";
import { can } from "./permissions.js";

await initProtectedPage({ active: "dashboard", allow: can.viewDashboard });

const $ = (id) => document.getElementById(id);
const CATEGORIES = [
  { key: "dizimos", label: "Dízimos" },
  { key: "ofertas", label: "Ofertas" },
  { key: "transferencias", label: "Transferências" },
  { key: "outras", label: "Outras entradas" },
];
const BADGE = {
  RECEBIDO: "bg-green-900/60 text-green-300",
  PENDENTE: "bg-yellow-900/60 text-yellow-300",
  DIVERGENTE: "bg-red-900/60 text-red-300",
};

let reports = [];
let loaded = false;

const cents = (v) => Math.round((Number(v) || 0) * 100);

onValue(
  ref(db, "relatorios"),
  (snapshot) => {
    reports = Object.entries(snapshot.val() || {}).map(([id, r]) => ({ id, ...r, status: r.status || "PENDENTE" }));
    loaded = true;
    render();
  },
  (error) => {
    console.error(error);
    $("categoryBars").replaceChildren(
      h("p", { class: "text-sm text-red-300", text: "Não foi possível carregar os dados. Verifique a conexão e suas permissões." })
    );
  }
);

function inPeriod() {
  const days = Number($("periodSelect").value);
  if (!days) return reports;
  const limit = Date.now() - days * 86_400_000;
  return reports.filter((r) => new Date(r.data).getTime() >= limit);
}

function render() {
  if (!loaded) return;
  const list = inPeriod();

  // Indicadores
  const total = list.reduce((acc, r) => acc + cents(r.total), 0);
  $("kpiTotal").textContent = formatBRL(total / 100);
  $("kpiCount").textContent = String(list.length);
  $("kpiPending").textContent = String(list.filter((r) => r.status === "PENDENTE").length);
  $("kpiDivergent").textContent = String(list.filter((r) => r.status === "DIVERGENTE").length);

  renderCategories(list);
  renderRecent();
}

function renderCategories(list) {
  const sums = CATEGORIES.map((c) => ({ ...c, value: list.reduce((acc, r) => acc + cents(r[c.key]), 0) }));
  const max = Math.max(...sums.map((s) => s.value), 0);
  const grand = sums.reduce((acc, s) => acc + s.value, 0);

  if (!grand) {
    $("categoryBars").replaceChildren(h("p", { class: "text-sm text-muted", text: "Nenhuma entrada no período selecionado." }));
    return;
  }

  $("categoryBars").replaceChildren(
    ...sums.map((s) => {
      const pct = max ? (s.value / max) * 100 : 0;
      const share = Math.round((s.value / grand) * 100);
      return h(
        "div",
        {},
        h(
          "div",
          { class: "mb-1 flex justify-between gap-4 text-sm" },
          h("span", { class: "font-medium", text: s.label }),
          h("span", { class: "text-muted", text: `${formatBRL(s.value / 100)} · ${share}%` })
        ),
        h(
          "div",
          { class: "h-3 w-full overflow-hidden rounded-full bg-field", role: "img", "aria-label": `${s.label}: ${formatBRL(s.value / 100)}, ${share}% do total` },
          h("div", { class: "h-full rounded-full bg-accent", style: `width:${pct}%` })
        )
      );
    })
  );
}

function renderRecent() {
  const recent = [...reports].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5);
  if (!recent.length) {
    $("recentBody").replaceChildren(
      h("tr", {}, h("td", { colspan: "4", class: "px-4 py-6 text-center text-muted", text: "Nenhum relatório cadastrado ainda." }))
    );
    return;
  }
  $("recentBody").replaceChildren(
    ...recent.map((r) => {
      const nomes = [r.conferente1, r.conferente2].filter(Boolean).join(" e ") || r.conferente || "";
      return h(
        "tr",
        {},
        h("td", { class: "whitespace-nowrap px-4 py-3", text: formatDate(r.data) }),
        h("td", { class: "whitespace-nowrap px-4 py-3 text-right font-medium", text: formatBRL(r.total) }),
        h("td", { class: `px-4 py-3 ${nomes ? "" : "text-muted"}`, text: nomes || "Sem assinatura" }),
        h("td", { class: "px-4 py-3" }, h("span", { class: `inline-block rounded-full px-3 py-1 text-xs font-bold ${BADGE[r.status] || BADGE.PENDENTE}`, text: r.status }))
      );
    })
  );
}

$("periodSelect").addEventListener("change", render);
