export default function Welcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-muted">
      <img src="/logo.svg" alt="Postgres Management Studio" className="h-20 w-20 drop-shadow" draggable="false" />
      <p className="text-xl text-[#374151]">Bem-vindo ao Postgres Management Studio</p>
      <p className="max-w-[500px] text-sm leading-relaxed">
        Conecte um servidor e use a árvore à esquerda para navegar. Clique em um objeto para abrir suas
        propriedades, use a Query Tool para executar SQL.
      </p>
    </div>
  );
}
