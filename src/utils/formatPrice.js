export function formatPrice(valor) {
  const numero = parseFloat(valor) || 0;
  return "$" + numero.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
