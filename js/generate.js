// generate.js — criar / editar relatório de caixa
import { db, ref, get, set, update, push } from "./firebase-init.js";
import { initProtectedPage } from "./layout.js";
import { formatBRL, toCents, toDateInputValue, dateInputToISO, toast } from "./utils.js";
import { can } from "./permissions.js";

const FIELDS = ["dizimos", "ofertas", "transferencias", "outras"];
const $ = (id) => document.getElementById(id);

const { user, profile } = await initProtectedPage({ active: "generate", allow: can.createReport });

const relatorioId = new URLSearchParams(window.location.search).get("id");
let existing = null;

/* ---------- Total ---------- */

const readCents = () => FIELDS.map((f) => toCents($(f).value));
const sum = (list) => list.reduce((a, b) => a + b, 0);

function renderTotal() {
  $("total").textContent = formatBRL(sum(readCents()) / 100);
}

FIELDS.forEach((f) => $(f).addEventListener("input", renderTotal));

/* ---------- Estado da tela ---------- */

function showNotice(message, isError = false) {
  const box = $("formNotice");
  box.textContent = message;
  box.classList.remove("hidden");
  box.classList.toggle("border-red-500", isError);
  box.classList.toggle("text-red-300", isError);
}

function setBusy(busy) {
  $("btn-salvar").disabled = busy;
  $("btn-assinar").disabled = busy;
  $("btn-salvar").textContent = busy ? "Salvando..." : "Salvar";
}

function lockForm() {
  [...FIELDS, "data"].forEach((id) => ($(id).disabled = true));
  $("btn-salvar").disabled = true;
  $("btn-assinar").disabled = true;
  $("btn-limpar").disabled = true;
}

/* ---------- Carregar relatório existente (modo edição) ---------- */

$("data").value = toDateInputValue();
$("data").max = toDateInputValue();

if (relatorioId) {
  $("pageTitle").textContent = "Editar relatório";
  document.title = "Editar relatório · Church Finance";

  try {
    const snapshot = await get(ref(db, `relatorios/${relatorioId}`));
    if (!snapshot.exists()) {
      showNotice("Relatório não encontrado.", true);
      lockForm();
    } else {
      existing = snapshot.val();
      FIELDS.forEach((f) => {
        const value = Number(existing[f]) || 0;
        $(f).value = value ? String(value) : "";
      });
      const dataValue = toDateInputValue(existing.data);
      if (dataValue) $("data").value = dataValue;

      if (!can.editReport(profile.role, existing)) {
        showNotice(
          existing.status === "RECEBIDO"
            ? "Este relatório já foi marcado como RECEBIDO e só pode ser alterado por um administrador."
            : "Seu perfil não pode alterar relatórios já criados."
        );
        lockForm();
      }
    }
  } catch (error) {
    console.error(error);
    showNotice("Erro ao carregar o relatório. Verifique a conexão e as permissões.", true);
    lockForm();
  }
}
renderTotal();

/* ---------- Validação e gravação ---------- */

function validate() {
  if (!$("data").value) return "Informe a data do culto.";

  for (const f of FIELDS) {
    const raw = $(f).value;
    if (raw !== "" && (Number.isNaN(parseFloat(raw)) || parseFloat(raw) < 0)) {
      return "Os valores não podem ser negativos.";
    }
  }
  if (sum(readCents()) <= 0) return "Informe pelo menos um valor maior que zero.";
  return null;
}

async function salvar(destino) {
  const erro = validate();
  if (erro) {
    toast(erro, "error");
    return;
  }

  setBusy(true);
  const [dizimos, ofertas, transferencias, outras] = readCents();
  const valores = {
    dizimos: dizimos / 100,
    ofertas: ofertas / 100,
    transferencias: transferencias / 100,
    outras: outras / 100,
    total: (dizimos + ofertas + transferencias + outras) / 100,
  };

  // Mantém o horário original se a data não mudou; senão grava ao meio-dia local.
  const mesmaData = existing?.data && toDateInputValue(existing.data) === $("data").value;
  const data = mesmaData ? existing.data : dateInputToISO($("data").value);

  try {
    let id = relatorioId;
    if (id) {
      await update(ref(db, `relatorios/${id}`), { ...valores, data });
    } else {
      const novoRef = push(ref(db, "relatorios"));
      id = novoRef.key;
      await set(novoRef, { ...valores, data, status: "PENDENTE", criadoPor: user.uid });
    }
    window.location.href = destino === "assinar" ? `signature.html?id=${id}` : "reports.html";
  } catch (error) {
    console.error(error);
    toast("Não foi possível salvar. Verifique a conexão e suas permissões.", "error");
    setBusy(false);
  }
}

$("reportForm").addEventListener("submit", (event) => {
  event.preventDefault();
  salvar("reports");
});
$("btn-assinar").addEventListener("click", () => salvar("assinar"));

$("btn-limpar").addEventListener("click", () => {
  FIELDS.forEach((f) => ($(f).value = ""));
  renderTotal();
  $(FIELDS[0]).focus();
});

$("btn-voltar").addEventListener("click", () => {
  window.location.href = "reports.html";
});
