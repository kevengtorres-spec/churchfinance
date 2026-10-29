// signature.js — conferência / assinatura do relatório (?id=...) ou visualização (?view=...)
import { db, ref, get, update } from "./firebase-init.js";
import { initProtectedPage } from "./layout.js";
import { h, formatBRL, formatDate, toast } from "./utils.js";
import { can } from "./permissions.js";

const $ = (id) => document.getElementById(id);
const { user, profile } = await initProtectedPage({ active: "reports" });

const params = new URLSearchParams(window.location.search);
const viewId = params.get("view");
const id = params.get("id") || viewId;
const modoVisualizacao = Boolean(viewId);

const info = $("infoRelatorio");
const message = $("relatorioInfo");
const form = $("signatureForm");
const saveBtn = $("gerarRelatorioBtn");

$("btn-voltar").addEventListener("click", () => {
  window.location.href = "reports.html";
});
$("pularRelatorioBtn").addEventListener("click", () => {
  window.location.href = "reports.html";
});

function hideForm(text) {
  form.classList.add("hidden");
  message.textContent = text || "";
}

function infoRows(r) {
  const rows = [
    ["Data", formatDate(r.data)],
    ["Dízimos", formatBRL(r.dizimos)],
    ["Ofertas", formatBRL(r.ofertas)],
    ["Transferências", formatBRL(r.transferencias)],
    ["Outras entradas", formatBRL(r.outras)],
    ["Total", formatBRL(r.total)],
    ["Status", r.status || "PENDENTE"],
  ];
  return h(
    "dl",
    { class: "space-y-1" },
    rows.map(([label, value], i) =>
      h(
        "div",
        { class: `flex justify-between gap-4 ${label === "Total" ? "border-t border-edge pt-2 font-bold" : ""}` },
        h("dt", { class: "text-muted", text: label }),
        h("dd", { class: i === rows.length - 1 ? "font-bold" : "", text: value })
      )
    )
  );
}

if (!id) {
  info.textContent = "ID do relatório não informado.";
  hideForm();
} else {
  try {
    const snapshot = await get(ref(db, `relatorios/${id}`));
    if (!snapshot.exists()) {
      info.textContent = "Relatório não encontrado.";
      hideForm();
    } else {
      const relatorio = snapshot.val();
      info.replaceChildren(infoRows(relatorio));

      $("conferente1").value = relatorio.conferente1 || "";
      $("conferente2").value = relatorio.conferente2 || "";

      const podeAssinar = can.signReport(profile.role, relatorio, user.uid);

      if (modoVisualizacao || !podeAssinar) {
        $("conferente1").disabled = true;
        $("conferente2").disabled = true;
        $("signActions").classList.add("hidden");
        message.textContent = modoVisualizacao
          ? "Modo visualização. Apenas leitura."
          : "Seu perfil não pode alterar os conferentes deste relatório.";
      } else {
        message.textContent = "Preencha os nomes dos conferentes para salvar o relatório.";
      }
    }
  } catch (error) {
    console.error(error);
    info.textContent = "Erro ao carregar o relatório. Verifique a conexão e suas permissões.";
    hideForm();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const conferente1 = $("conferente1").value.trim();
  const conferente2 = $("conferente2").value.trim();

  if (!conferente1 && !conferente2) {
    toast("Informe pelo menos um conferente.", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Salvando...";

  try {
    await update(ref(db, `relatorios/${id}`), { conferente1, conferente2 });
    toast("Relatório salvo com sucesso!", "success");
    setTimeout(() => (window.location.href = "reports.html"), 800);
  } catch (error) {
    console.error(error);
    toast("Não foi possível salvar. Verifique a conexão e suas permissões.", "error");
    saveBtn.disabled = false;
    saveBtn.textContent = "Salvar";
  }
});
