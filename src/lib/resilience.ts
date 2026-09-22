// Peças puras e testáveis da resiliência do provedor de dados de trânsito: tipo de erro,
// status de conexão exposto pra UI, cálculo de backoff e a mensagem em pt-BR (DESIGN.md
// § Tom e voz: erro diz o que fazer, não só o que falhou). Usado hoje pelo provedor mock
// (`transitProvider.ts`, que nunca falha sozinho) e depois pela chamada real da URBS —
// nada aqui depende de timer nem de rede real, por isso dá pra testar direto.

// Falha ao buscar dados por causa de conectividade (sem rede, timeout, etc.) — distinta de
// um erro genérico (dado malformado, bug no parsing), pra UI mostrar "sem conexão" e não
// um erro cru.
export class NetworkError extends Error {
  constructor(message = 'Falha de rede ao buscar dados de trânsito') {
    super(message);
    this.name = 'NetworkError';
  }
}

export type ConnectionState = 'online' | 'offline' | 'error';

export interface ConnectionStatus {
  state: ConnectionState;
  /** epoch ms do último dado bom recebido, ou null se ainda não veio nenhum. */
  lastUpdatedAt: number | null;
  consecutiveFailures: number;
}

export const INITIAL_CONNECTION_STATUS: ConnectionStatus = {
  state: 'online',
  lastUpdatedAt: null,
  consecutiveFailures: 0,
};

/**
 * Backoff exponencial com teto: cada falha consecutiva dobra o intervalo até `maxMs`,
 * pra nunca martelar a fonte de dados numa falha em loop (guarda de rate-limit do cliente).
 */
export function computeBackoffDelay(baseMs: number, maxMs: number, consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return baseMs;
  return Math.min(baseMs * 2 ** consecutiveFailures, maxMs);
}

/** Deriva o próximo status a partir do resultado de uma tentativa de busca. */
export function nextConnectionStatus(
  current: ConnectionStatus,
  result: { ok: true } | { ok: false; error: unknown },
  now: number,
): ConnectionStatus {
  if (result.ok) {
    return { state: 'online', lastUpdatedAt: now, consecutiveFailures: 0 };
  }
  const state: ConnectionState = result.error instanceof NetworkError ? 'offline' : 'error';
  return { state, lastUpdatedAt: current.lastUpdatedAt, consecutiveFailures: current.consecutiveFailures + 1 };
}

/** Mensagem pt-BR pra exibir na UI, ou null quando está tudo bem (não mostra nada). */
export function formatConnectionMessage(status: ConnectionStatus): string | null {
  if (status.state === 'online') return null;

  const time = status.lastUpdatedAt
    ? new Date(status.lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (status.state === 'offline') {
    return time
      ? `Sem conexão. Mostrando os últimos dados de ${time}.`
      : 'Sem conexão. Buscando dados assim que possível.';
  }

  return time
    ? `Não foi possível atualizar. Mostrando os últimos dados de ${time}.`
    : 'Não foi possível atualizar. Tentando de novo.';
}
