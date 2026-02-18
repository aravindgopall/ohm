import { invoke } from "@tauri-apps/api/core";

export type Clip = {
  id: number;
  content: string;
  created_at: number;
};

export async function listClips(limit = 200, query?: string): Promise<Clip[]> {
  return await invoke<Clip[]>("list_clips", { limit, query });
}

export async function selectClip(id: number): Promise<{ pasted: boolean }> {
  return await invoke<{ pasted: boolean }>("select_clip", { id });
}
