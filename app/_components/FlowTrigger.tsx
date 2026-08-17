"use client";

export const OPEN_FLOW_EVENT = "fusiads:open-flow";

type Props = {
  className?: string;
  title?: string;
  children: React.ReactNode;
};

// Botao que abre o fluxo de chat (o ChatFlow escuta este evento).
export default function FlowTrigger({ className, title, children }: Props) {
  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event(OPEN_FLOW_EVENT));
  };
  return (
    <a href="#" onClick={open} className={className} title={title}>
      {children}
    </a>
  );
}
