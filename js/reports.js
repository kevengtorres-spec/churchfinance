// reports.js — histórico de contagens de culto (relatórios de caixa em espécie)
import { db, ref, onValue, update, remove, query, orderByChild, equalTo } from "./firebase-init.js";
import { initProtectedPage } from "./layout.js";
import { h, formatBRL, formatDate, normalize, toast, confirmDialog, STATUS } from "./utils.js";
import { can } from "./permissions.js";

const { user, profile } = await initProtectedPage({
  active: "reports",
  allow: (role) => can.viewAllReports(role) || can.viewOnlyOwnReports(role),
});
const role = profile.role;

const searchInput = document.getElementById("searchInput");
const tableBody = document.getElementById("tableBody");
const summary = document.getElementById("summary");

let reports = [];
let loaded = false;

/* ---------- Dados (um único listener) ---------- */

// Diácono conferente só lê as contagens que ele mesmo criou (as regras do banco exigem esta consulta).
const source = can.viewOnlyOwnReports(role)
  ? query(ref(db, "relatorios"), orderByChild("criadoPor"), equalTo(user.uid))
  : ref(db, "relatorios");

if (can.viewOnlyOwnReports(role)) {
  document.querySelector("main p.text-muted")?.append(" (somente as que você criou)");
}

onValue(
  source,
  (snapshot) => {
    const data = snapshot.val() || {};
    reports = Object.entries(data).map(([id, r]) => ({ id, ...r, status: r.status || "PENDENTE" }));
    loaded = true;
    render();
  },
  (error) => {
    console.error(error);
    summary.textContent = "";
    showMessage("Não foi possível carregar os relatórios. Verifique a conexão e suas permissões.", true);
  }
);

/* ---------- Filtros ---------- */

function conferentesDe(r) {
  const nomes = [r.conferente1, r.conferente2].filter(Boolean);
  if (nomes.length) return nomes.join(" e ");
  return r.conferente || ""; // campo legado
}

function getFiltered() {
  const days = Number(document.querySelector('input[name="periodFilter"]:checked').value);
  const limit = days ? Date.now() - days * 86_400_000 : 0;
  const term = normalize(searchInput.value);

  return reports
    .filter((r) => {
      if (limit && !(new Date(r.data).getTime() >= limit)) return false;
      if (!term) return true;
      const haystack = normalize(
        [formatDate(r.data), formatBRL(r.total), r.total, conferentesDe(r), r.status].join(" ")
      );
      return haystack.includes(term);
    })
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

/* ---------- Renderização ---------- */

const BADGE = {
  RECEBIDO: "bg-green-900/60 text-green-300",
  PENDENTE: "bg-yellow-900/60 text-yellow-300",
  DIVERGENTE: "bg-red-900/60 text-red-300",
};

function showMessage(text, isError = false) {
  tableBody.replaceChildren(
    h("tr", {}, h("td", { colspan: "5", class: `px-3 py-8 text-center ${isError ? "text-red-300" : "text-muted"}`, text }))
  );
}

function statusCell(r) {
  if (!can.changeStatus(role)) {
    return h("span", { class: `inline-block rounded-full px-3 py-1 text-xs font-bold ${BADGE[r.status] || BADGE.PENDENTE}`, text: r.status });
  }
  return h(
    "select",
    {
      "aria-label": `Status do relatório de ${formatDate(r.data)}`,
      class: "rounded-lg border-edge bg-surface py-1 pl-2 pr-8 text-xs font-bold text-white",
      onchange: (event) => mudarStatus(r, event.target.value),
    },
    STATUS.map((s) => h("option", { value: s, selected: s === r.status, text: s }))
  );
}

function actionLink(href, label, style) {
  return h("a", { href, text: label, class: `rounded px-2 py-1 text-xs font-bold text-white transition ${style}` });
}

function actionsCell(r) {
  const cell = h("div", { class: "flex flex-wrap gap-2" });
  const id = encodeURIComponent(r.id);

  cell.append(actionLink(`signature.html?view=${id}`, "Visualizar", "bg-green-700 hover:bg-green-600"));

  if (can.editReport(role, r)) {
    cell.append(actionLink(`generate.html?id=${id}`, "Editar", "bg-blue-600 hover:bg-blue-500"));
  }
  if (can.signReport(role, r, user.uid)) {
    cell.append(actionLink(`signature.html?id=${id}`, "Assinar", "bg-field hover:bg-edge"));
  }
  if (r.status === "RECEBIDO" && role === "DIACONO_MASTER") {
    cell.append(
      h("span", {
        class: "cursor-not-allowed rounded bg-field px-2 py-1 text-xs font-bold text-muted",
        title: "Relatório já recebido pela tesouraria: somente um administrador pode alterar",
        text: "Bloqueado",
      })
    );
  }
  if (can.deleteReport(role, r)) {
    cell.append(
      h("button", {
        type: "button",
        class: "rounded bg-red-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-red-700",
        text: "Excluir",
        onclick: () => excluir(r),
      })
    );
  }
  return cell;
}

function row(r) {
  const nomes = conferentesDe(r);
  return h(
    "tr",
    { class: "hover:bg-surface/60" },
    h("td", { class: "px-3 py-3" }, statusCell(r)),
    h("td", { class: "whitespace-nowrap px-3 py-3", text: formatDate(r.data) }),
    h("td", { class: "whitespace-nowrap px-3 py-3 text-right font-medium", text: formatBRL(r.total) }),
    h("td", { class: `px-3 py-3 ${nomes ? "" : "text-muted"}`, text: nomes || "Sem assinatura" }),
    h("td", { class: "px-3 py-3" }, actionsCell(r))
  );
}

function render() {
  if (!loaded) return;
  const list = getFiltered();
  const totalCents = list.reduce((acc, r) => acc + Math.round((Number(r.total) || 0) * 100), 0);

  summary.textContent = list.length
    ? `${list.length} relatório${list.length > 1 ? "s" : ""} · Total no filtro: ${formatBRL(totalCents / 100)}`
    : "";

  if (!list.length) {
    showMessage(
      reports.length
        ? "Nenhum relatório encontrado para os filtros selecionados."
        : "Nenhum relatório cadastrado ainda."
    );
    return;
  }
  tableBody.replaceChildren(...list.map(row));
}

/* ---------- Ações ---------- */

async function mudarStatus(r, novoStatus) {
  try {
    await update(ref(db, `relatorios/${r.id}`), { status: novoStatus });
    toast("Status atualizado.", "success");
  } catch (error) {
    console.error(error);
    toast("Não foi possível atualizar o status.", "error");
    render(); // volta o seletor ao valor salvo
  }
}

async function excluir(r) {
  const ok = await confirmDialog(
    `Excluir o relatório de ${formatDate(r.data)} (${formatBRL(r.total)})? Essa ação não pode ser desfeita.`,
    { confirmText: "Excluir", danger: true }
  );
  if (!ok) return;
  try {
    await remove(ref(db, `relatorios/${r.id}`));
    toast("Relatório excluído.", "success");
  } catch (error) {
    console.error(error);
    toast("Não foi possível excluir o relatório.", "error");
  }
}

/* ---------- Eventos ---------- */

searchInput.addEventListener("input", render);
document.querySelectorAll('input[name="periodFilter"]').forEach((radio) => radio.addEventListener("change", render));
