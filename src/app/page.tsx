import McpTerminal from './components/McpTerminal';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-6">Cliente MCP com React e Next.js</h1>
      <div className="w-full max-w-2xl">
        <McpTerminal />
      </div>
    </main>
  );
}
