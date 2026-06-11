export function formatPrice(valor) {
  const numero = parseFloat(valor) || 0;
  return numero.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
