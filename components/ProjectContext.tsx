'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client/api';

export interface ProjectView { id: string; name: string; description: string; website_url: string; category: string; status: string; allowed_return_origins: string[]; created_at: string }
interface Ctx { projects: ProjectView[]; current: ProjectView | null; setCurrentId: (id: string) => void; reload: () => Promise<void>; loading: boolean }
const PC = createContext<Ctx>({ projects: [], current: null, setCurrentId: () => {}, reload: async () => {}, loading: true });
export const useProjects = () => useContext(PC);

const KEY = 'money.currentProject';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } };

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try { setProjects((await api<{ data: ProjectView[] }>('projects')).data); } catch { setProjects([]); }
    setLoading(false);
  }, []);
  useEffect(() => { setId(read()); void reload(); }, [reload]);

  const current = useMemo(() => projects.find((p) => p.id === id) ?? projects.find((p) => p.status === 'active') ?? projects[0] ?? null, [projects, id]);
  const value = useMemo(() => ({ projects, current, loading, reload, setCurrentId: (v: string) => { setId(v); write(v); } }), [projects, current, loading, reload]);
  return <PC.Provider value={value}>{children}</PC.Provider>;
}
