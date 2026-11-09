/** Normaliza texto: minúsculas, sem acentos e com pontuação virando espaço. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Texto normalizado com espaços nas pontas, para casar palavras inteiras. */
export function pad(input: string): string {
  const value = normalize(input);
  return value.length > 0 ? ` ${value} ` : " ";
}
