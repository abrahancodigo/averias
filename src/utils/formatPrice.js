export function formatPrice(valor) {
  const numero = parseFloat(valor) || 0;
  const partes = numero.toFixed(2).split(".");
  const entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + entero + "." + partes[1];
}
