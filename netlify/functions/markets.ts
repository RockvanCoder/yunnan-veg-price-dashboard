import { json } from "./_shared";
import { buildMarketsPayload } from "./service";

export async function handler() {
  try {
    return json(await buildMarketsPayload());
  } catch {
    return json({ markets: [], source: "official_error" }, 502);
  }
}
