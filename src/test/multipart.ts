/**
 * Los campos de un multipart que recibió MSW, como texto. Los tipos de React
 * Native declaran un `FormData` sin `get` ni `forEach`; el de Node, que es el que
 * llega acá, tiene los dos.
 */
export async function multipartFields(request: Request): Promise<Record<string, string>> {
  const form = (await request.formData()) as unknown as {
    forEach(cb: (valor: unknown, campo: string) => void): void;
  };
  const campos: Record<string, string> = {};
  form.forEach((valor, campo) => {
    campos[campo] = String(valor);
  });
  return campos;
}
