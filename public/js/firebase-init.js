// firebase-init.js
// Único ponto de inicialização do Firebase. Todas as páginas importam daqui,
// então a versão do SDK só precisa ser alterada neste arquivo.
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// A apiKey do Firebase Web é um identificador público (não é segredo).
// A proteção real vem das Database Rules (database.rules.json) e da
// restrição de domínios da chave no Google Cloud Console.
const firebaseConfig = {
  apiKey: "AIzaSyAGVwVmUw4Zkwbc7qB-aXrMlBU_3jSljrM",
  authDomain: "teste2-3451b.firebaseapp.com",
  databaseURL: "https://teste2-3451b-default-rtdb.firebaseio.com",
  projectId: "teste2-3451b",
  storageBucket: "teste2-3451b.firebasestorage.app",
  messagingSenderId: "535637722206",
  appId: "1:535637722206:web:ae8b02510d9f491aaa20cf",
  measurementId: "G-MERXHBVL6N",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/**
 * Cria um usuário no Firebase Auth SEM derrubar a sessão de quem está logado
 * (usa um app secundário temporário). Devolve o UID novo.
 */
async function createAuthUser(email, password) {
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}

export {
  auth,
  db,
  // auth
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  createAuthUser,
  // database
  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
};
