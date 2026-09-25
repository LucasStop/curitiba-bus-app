// Parsing puro da resposta de getVeiculos (docs/URBS-WEBSERVICE.md). Sem rede nem Deno.

export interface IngestRow {
  prefix: string;
  line_code: string;
  lat: number;
  lon: number;
  refreshed_at: string; // ISO UTC
  status: string | null;
  route_state: string | null;
  urbs_direction: string | null;
  accessible: boolean;
  vehicle_type: string | null;
  schedule_table: string | null;
}

const STATUS: Record<string, string> = {
  "NO HORÁRIO": "on_time",
  "ATRASADO": "late",
  "ADIANTADO": "early",
  "NÃO CONFORMIDADE": "nonconforming",
};
const ROUTE_STATE: Record<string, string> = {
  "REALIZANDO ROTA": "on_route",
  "FORA DA ROTA": "off_route",
};

// Caixa de Curitiba e regiao metropolitana: descarta GPS zerado ou fora do lugar.
const LAT = [-25.75, -25.25];
const LON = [-49.55, -49.05];

const MAX_AGE_MS = 10 * 60 * 1000;
const BRT_OFFSET_H = 3; // America/Sao_Paulo sem horario de verao (UTC-3 fixo)

// REFRESH vem como HH:MM:SS de Sao Paulo, sem data. Se cair mais de 5 min no futuro, e de ontem.
export function refreshToTimestamp(hhmmss: string, now: Date): Date {
  const [h, m, s] = hhmmss.split(":").map(Number);
  const brtNow = new Date(now.getTime() - BRT_OFFSET_H * 3600_000);
  const utc = Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), brtNow.getUTCDate(), h + BRT_OFFSET_H, m, s);
  const ts = new Date(utc);
  return ts.getTime() > now.getTime() + 5 * 60_000 ? new Date(utc - 24 * 3600_000) : ts;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

export function parseVehicles(raw: unknown, now: Date): IngestRow[] {
  if (!raw || typeof raw !== "object") return [];
  const list: unknown[] = Array.isArray(raw) ? raw : Object.values(raw);
  const rows = new Map<string, IngestRow>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    const prefix = str(v.COD);
    const lineCode = str(v.CODIGOLINHA);
    const situacao = str(v.SITUACAO);
    const sent = str(v.SENT);
    const time = str(v.REFRESH);
    if (!prefix || !lineCode || !situacao || !sent || !time) continue; // fora de operacao
    if (lineCode === "REC") continue; // recolhimento, nao e linha de passageiro
    if (!/^\d{1,2}:\d{2}:\d{2}$/.test(time)) continue;

    const lat = Number(v.LAT);
    const lon = Number(v.LON);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < LAT[0] || lat > LAT[1] || lon < LON[0] || lon > LON[1]) continue;

    const refreshed = refreshToTimestamp(time, now);
    if (now.getTime() - refreshed.getTime() > MAX_AGE_MS) continue;

    rows.set(prefix, {
      prefix,
      line_code: lineCode,
      lat,
      lon,
      refreshed_at: refreshed.toISOString(),
      status: STATUS[situacao] ?? null,
      route_state: ROUTE_STATE[str(v.SITUACAO2) ?? ""] ?? "other",
      urbs_direction: sent,
      accessible: v.ADAPT === "1" || v.ADAPT === 1,
      vehicle_type: str(v.TIPO_VEIC),
      schedule_table: str(v.TABELA),
    });
  }
  return [...rows.values()];
}
