// Carregado logo depois do script do Tailwind (CDN) em todas as páginas.
// Centraliza a paleta: troque uma cor aqui e ela muda no site inteiro.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        canvas: "#162013", // fundo da página
        surface: "#21301c", // cartões e campos
        field: "#2e4328", // botões secundários, barras
        edge: "#426039", // bordas
        muted: "#a2c398", // texto secundário
        accent: "#53d22c", // ação principal
        mint: "#8cd279", // destaque suave
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
};
