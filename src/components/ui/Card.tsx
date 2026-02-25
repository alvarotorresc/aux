import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-lg border border-border bg-bg-card p-6 ${className ?? ''}`}>
      {children}
    </div>
  );
}
