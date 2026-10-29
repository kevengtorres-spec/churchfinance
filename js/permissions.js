// permissions.js — perfis e o que cada um pode fazer na interface.
// ATENÇÃO: isto só controla o que aparece na tela. A proteção de verdade
// está em database.rules.json (as duas listas precisam andar juntas).

export const ROLE = {
  ADM: "ADM",
  DIACONO_MASTER: "DIACONO_MASTER",
  DIACONO_CONFERENTE: "DIACONO_CONFERENTE",
  TESOUREIRO_MASTER: "TESOUREIRO_MASTER",
  TESOUREIRO_CONSULTA: "TESOUREIRO_CONSULTA",
};

export const ROLE_LABEL = {
  ADM: "Administrador",
  DIACONO_MASTER: "Diácono master",
  DIACONO_CONFERENTE: "Diácono conferente",
  TESOUREIRO_MASTER: "Tesoureiro master",
  TESOUREIRO_CONSULTA: "Tesoureiro consulta",
};

// Perfis antigos continuam funcionando até serem convertidos na tela Usuários.
const LEGACY = { MASTER: "ADM", CONFERENTE: "DIACONO_CONFERENTE" };

export const isLegacyRole = (raw) => Object.prototype.hasOwnProperty.call(LEGACY, raw);
export const legacyTarget = (raw) => LEGACY[raw];

/** Devolve um dos 5 perfis atuais, ou null se o valor for desconhecido. */
export function normalizeRole(raw) {
  if (isLegacyRole(raw)) return LEGACY[raw];
  return Object.prototype.hasOwnProperty.call(ROLE, raw) ? raw : null;
}

const { ADM, DIACONO_MASTER: DM, DIACONO_CONFERENTE: DC, TESOUREIRO_MASTER: TM, TESOUREIRO_CONSULTA: TC } = ROLE;

const statusOf = (report) => report?.status || "PENDENTE";
const open = (report) => statusOf(report) !== "RECEBIDO";

export const can = {
  // Contagens de culto (relatórios de caixa em espécie)
  viewAllReports: (role) => [ADM, DM, TM, TC].includes(role),
  viewOnlyOwnReports: (role) => role === DC,
  createReport: (role) => [ADM, DM, DC].includes(role),
  editReport: (role, report) => role === ADM || (role === DM && open(report)),
  deleteReport: (role, report) => role === ADM || (role === DM && open(report)),
  signReport: (role, report, uid) =>
    role === ADM ||
    (role === DM && open(report)) ||
    (role === DC && report?.criadoPor === uid && statusOf(report) === "PENDENTE"),
  changeStatus: (role) => [ADM, TM].includes(role),

  // Tesouraria
  viewDashboard: (role) => [ADM, TM, TC].includes(role),

  // Administração
  manageUsers: (role) => role === ADM,
};
