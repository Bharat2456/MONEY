'use client';
import { useProjects } from '@/components/ProjectContext';
import { Empty, ErrorNote, NeedProject, PageHeader, Spinner, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { formatDate } from '@/lib/client/api';

interface Log { id: string; at: number; method: string; path: string; status: number; durationMs: number }

export default function Logs() {
  const { current } = useProjects();
  const { data, loading, error } = useApiData<{ data: Log[] }>(current ? `projects/${current.id}/logs` : null, { pollMs: 10000 });
  if (!current) return <NeedProject />;
  return (
    <>
      <PageHeader title="API logs" sub="Metadata for requests authenticated with your secret key. Request bodies and keys are never logged." />
      <ErrorNote message={error} />
      {loading && !data ? <Spinner /> : !data?.data.length ? <Empty title="No API calls yet">Calls to <code className="font-mono text-caramel-300">/api/v1</code> will appear here.</Empty> : (
        <Table head={['Time', 'Method', 'Path', 'Status', 'Duration']}>{data.data.map((l) => <tr key={l.id}><td className="td text-caramel-200/70">{formatDate(new Date(l.at).toISOString())}</td><td className="td font-mono text-xs">{l.method}</td><td className="td font-mono text-xs">{l.path}</td><td className={`td font-mono text-xs ${l.status >= 400 ? 'text-bad' : 'text-ok'}`}>{l.status}</td><td className="td text-caramel-200/70">{l.durationMs} ms</td></tr>)}</Table>
      )}
    </>
  );
}
