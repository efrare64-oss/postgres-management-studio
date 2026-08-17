import Modal from './Modal';

interface AboutDialogProps {
  onClose: () => void;
}

export default function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <Modal title="Sobre" onClose={onClose}>
      <div className="about">
        <div className="mb-3 flex items-center gap-3">
          <img src="/logo.svg" alt="Postgres Management Studio" className="h-12 w-12" draggable="false" />
          <div>
            <p className="m-0"><strong>Postgres Management Studio</strong></p>
            <p className="m-0 text-sm text-muted">Gerenciador de servidores PostgreSQL.</p>
          </div>
        </div>
        <p>Versão 0.2.0 • Stack: Go, React + TypeScript + Vite 8. + Tailwind 4.</p>
      </div>
    </Modal>
  );
}
