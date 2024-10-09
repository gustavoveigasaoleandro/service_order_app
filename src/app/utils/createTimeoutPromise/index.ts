// Função auxiliar para criar a promessa de timeout
export function createTimeoutPromise<T>(timeout: number): Promise<T> {
  return new Promise<T>((_, reject) =>
    setTimeout(
      () => reject({ error: "Tempo limite excedido para resposta" }),
      timeout
    )
  );
}
