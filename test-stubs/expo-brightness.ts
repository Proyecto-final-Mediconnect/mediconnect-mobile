/* Stub de `expo-brightness` para Vitest: el brillo es del dispositivo. */
let brillo = 0.4;

export async function getBrightnessAsync(): Promise<number> {
  return brillo;
}

export async function setBrightnessAsync(valor: number): Promise<void> {
  brillo = valor;
}
