// 非高峰时段快照（每个 :30 分执行）
// 直接复用 snapshot.ts 的核心逻辑
import { runSnapshot } from "./snapshot";

export async function handler() {
  return runSnapshot();
}
