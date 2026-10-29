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
  apiKey: "AIzaSyBJV9nz2k26CeHBTCsg0PM5JdvZhtIfS1A",
  authDomain: "churchfinance-5948f.firebaseapp.com",
  databaseURL: "https://churchfinance-5948f-default-rtdb.firebaseio.com",
  projectId: "churchfinance-5948f",
  storageBucket: "churchfinance-5948f.firebasestorage.app",
  messagingSenderId: "369824624976",
  appId: "1:369824624976:web:8b1d41af3f8bc54ef8fc55",
  measurementId: "G-B3BL9YZVXV"
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
