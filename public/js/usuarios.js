// usuarios.js — administração de usuários (somente ADM)
import { db, ref, onValue, update, set, createAuthUser } from "./firebase-init.js";
import { initProtectedPage } from "./layout.js";
import { h, toast, friendlyAuthError } from "./utils.js";
import { can, ROLE, ROLE_LABEL, normalizeRole, isLegacyRole, legacyTarget } from "./permissions.js";

const $ = (id) => document.getElementById(id);
const { user } = await initProtectedPage({ active: "usuarios", allow: can.manageUsers });

let users = [];

/* ---------- Perfis disponíveis ---------- */

const roleOptions = (selected, includeLegacyLabel) =>
  Object.values(ROLE).map((r) => h("option", { value: r, selected: r === selected, text: ROLE_LABEL[r] })).concat(
    includeLegacyLabel ? [h("option", { value: includeLegacyLabel, selected: true, text: `${includeLegacyLabel} (antigo)` })] : []
  );

$("newRole").replaceChildren(...roleOptions(ROLE.DIACONO_CONFERENTE));

/* ---------- Dados ---------- */

onValue(
  ref(db, "users"),
  (snapshot) => {
    users = Object.entries(snapshot.val() || {})
      .map(([uid, u]) => ({ uid, ...u }))
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    render();
  },
  (error) => {
    console.error(error);
    $("usersBody").replaceChildren(
      h("tr", {}, h("td", { colspan: "4", class: "px-3 py-8 text-center text-red-300", text: "Não foi possível carregar os usuários." }))
    );
  }
);

/* ---------- Tabela ---------- */

async function save(uid, changes, okMessage) {
  try {
    await update(ref(db, `users/${uid}`), changes);
    toast(okMessage, "success");
  } catch (error) {
    console.error(error);
    toast("Não foi possível salvar. Verifique suas permissões.", "error");
    render();
  }
}

function row(u) {
  const self = u.uid === user.uid;
  const legacy = isLegacyRole(u.role) ? u.role : null;
  const current = normalizeRole(u.role);
  const active = u.ativo !== false;

  const roleSelect = h(
    "select",
    {
      "aria-label": `Perfil de ${u.nome || u.email || u.uid}`,
      disabled: self,
      title: self ? "Você não pode alterar o próprio perfil" : null,
      class: "rounded-lg border-edge bg-surface py-1 pl-2 pr-8 text-sm text-white disabled:opacity-60",
      onchange: (event) => save(u.uid, { role: event.target.value }, "Perfil atualizado."),
    },
    roleOptions(legacy ? null : current, legacy)
  );

  const toggle = h("button", {
    type: "button",
    disabled: self,
    title: self ? "Você não pode desativar a própria conta" : null,
    class: `rounded-full px-3 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
      active ? "bg-green-900/60 text-green-300 hover:bg-green-900" : "bg-red-900/60 text-red-300 hover:bg-red-900"
    }`,
    text: active ? "Ativo" : "Desativado",
    onclick: () => save(u.uid, { ativo: !active }, active ? "Usuário desativado." : "Usuário ativado."),
  });

  return h(
    "tr",
    { class: "hover:bg-surface/60" },
    h("td", { class: "px-3 py-3 font-medium", text: u.nome || "(sem nome)" }, self ? h("span", { class: "ml-2 text-xs text-muted", text: "(você)" }) : null),
    h("td", { class: "px-3 py-3 text-muted", text: u.email || "—" }),
    h("td", { class: "px-3 py-3" }, roleSelect),
    h("td", { class: "px-3 py-3" }, toggle)
  );
}

function render() {
  if (!users.length) {
    $("usersBody").replaceChildren(
      h("tr", {}, h("td", { colspan: "4", class: "px-3 py-8 text-center text-muted", text: "Nenhum usuário cadastrado." }))
    );
  } else {
    $("usersBody").replaceChildren(...users.map(row));
  }
  $("legacyBox").classList.toggle("hidden", !users.some((u) => isLegacyRole(u.role)));
}

/* ---------- Converter perfis antigos (uma gravação só) ---------- */

$("legacyBtn").addEventListener("click", async () => {
  const changes = {};
  users.filter((u) => isLegacyRole(u.role)).forEach((u) => (changes[`${u.uid}/role`] = legacyTarget(u.role)));
  if (!Object.keys(changes).length) return;

  $("legacyBtn").disabled = true;
  try {
    await update(ref(db, "users"), changes);
    toast(`${Object.keys(changes).length} usuário(s) convertido(s).`, "success");
  } catch (error) {
    console.error(error);
    toast("Não foi possível converter os perfis.", "error");
  } finally {
    $("legacyBtn").disabled = false;
  }
});

/* ---------- Novo usuário ---------- */

$("newUserForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = $("newNome").value.trim();
  const email = $("newEmail").value.trim();
  const senha = $("newSenha").value;
  const role = $("newRole").value;

  if (!nome || !email) return toast("Informe nome e e-mail.", "error");
  if (senha.length < 6) return toast("A senha deve ter pelo menos 6 caracteres.", "error");
  if (!normalizeRole(role)) return toast("Escolha um perfil válido.", "error");

  $("newUserBtn").disabled = true;
  $("newUserBtn").textContent = "Criando...";

  let uid;
  try {
    uid = await createAuthUser(email, senha);
  } catch (error) {
    console.error(error.code);
    toast(friendlyAuthError(error), "error");
    $("newUserBtn").disabled = false;
    $("newUserBtn").textContent = "Criar usuário";
    return;
  }

  try {
    await set(ref(db, `users/${uid}`), { nome, email, role, ativo: true });
    toast("Usuário criado.", "success");
    $("newUserForm").reset();
    $("newRole").value = ROLE.DIACONO_CONFERENTE;
  } catch (error) {
    console.error(error);
    toast("A conta foi criada, mas o perfil não foi salvo. Cadastre o perfil manualmente.", "error");
  } finally {
    $("newUserBtn").disabled = false;
    $("newUserBtn").textContent = "Criar usuário";
  }
});
