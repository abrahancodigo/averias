export const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};
