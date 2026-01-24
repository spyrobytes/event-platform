import { cn } from "@/lib/utils";
import { Container } from "./Container";
import React from "react";

type SectionProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
};

export function Section({ id, children, className, containerClassName }: SectionProps) {
  return (
    <section id={id} className={cn("py-16 sm:py-20", className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
