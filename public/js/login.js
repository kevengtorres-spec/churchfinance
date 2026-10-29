// login.js
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "./firebase-init.js";
import { toast, friendlyAuthError } from "./utils.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const forgotButton = document.getElementById("forgotPasswordButton");

// Quem já está logado vai direto para a página principal.
onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("index.html");
});

function setBusy(busy) {
  loginButton.disabled = busy;
  forgotButton.disabled = busy;
  loginButton.textContent = busy ? "Entrando..." : "Entrar";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    toast("Preencha e-mail e senha.", "error");
    return;
  }

  setBusy(true);
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("index.html");
  } catch (error) {
    console.error(error.code);
    toast(friendlyAuthError(error), "error");
    setBusy(false);
  }
});

forgotButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) {
    toast("Digite seu e-mail para redefinir a senha.", "error");
    emailInput.focus();
    return;
  }

  forgotButton.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    toast("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.", "success");
  } catch (error) {
    console.error(error.code);
    // Não revela se o e-mail existe ou não (evita enumeração de usuários).
    if (error.code === "auth/user-not-found") {
      toast("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.", "success");
    } else {
      toast(friendlyAuthError(error), "error");
    }
  } finally {
    forgotButton.disabled = false;
  }
});
