/*
 * Stub de `expo-file-system` para Vitest: el disco es nativo. Los tests dicen
 * qué tamaño tiene cada archivo (`__disco.tamanos`) y ven qué se borró.
 */
export const __disco = {
  /** El tamaño en disco de cada uri; las que no están no existen. */
  tamanos: new Map<string, number>(),
  /** El texto de cada uri, para `File.text()`. */
  contenidos: new Map<string, string>(),
  borrados: [] as string[],
  reiniciar(): void {
    this.tamanos.clear();
    this.contenidos.clear();
    this.borrados.length = 0;
  },
};

export class File {
  constructor(readonly uri: string) {}

  get exists(): boolean {
    return __disco.tamanos.has(this.uri) || this.uri.startsWith(Paths.cache.uri);
  }

  get size(): number {
    return __disco.tamanos.get(this.uri) ?? 0;
  }

  text(): Promise<string> {
    const contenido = __disco.contenidos.get(this.uri);
    return contenido === undefined
      ? Promise.reject(new Error('No existe el archivo.'))
      : Promise.resolve(contenido);
  }

  delete(): void {
    __disco.borrados.push(this.uri);
  }
}

export const Paths = { cache: { uri: 'file:///cache/' } };
