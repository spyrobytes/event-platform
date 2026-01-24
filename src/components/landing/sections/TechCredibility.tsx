"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { Section } from "../ui/Section";
import styles from "./TechCredibility.module.css";

type TechPoint = {
  title: string;
  body: string;
  icon: ReactNode;
  progress: number;
  color: string;
};

const points: TechPoint[] = [
  {
    title: "Modern web architecture",
    body: "Fast, indexable pages that load instantly.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    progress: 95,
    color: "#3b82f6",
  },
  {
    title: "Serverless scale",
    body: "Handles spikes gracefully without manual ops.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    progress: 90,
    color: "#8b5cf6",
  },
  {
    title: "Secure flows",
    body: "Data handling, auth, and email delivery done right.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    progress: 100,
    color: "#10b981",
  },
];

function CircularProgress({
  progress,
  color,
  isVisible,
  children,
}: {
  progress: number;
  color: string;
  isVisible: boolean;
  children: ReactNode;
}) {
  const radius = 24;
  const strokeWidth = 3;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="currentColor"
          className="text-black/10"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isVisible ? strokeDashoffset : circumference}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
        {children}
      </div>
    </div>
  );
}

type FlowNode = {
  title: string;
  label: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
};

const flowNodes: FlowNode[] = [
  {
    title: "Landing Pages",
    label: "SEO discovery",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.15)",
  },
  {
    title: "RSVP Flows",
    label: "Secure + reliable",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.15)",
  },
  {
    title: "Email Delivery",
    label: "Transactional-ready",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.15)",
  },
  {
    title: "Analytics",
    label: "Practical insights",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.15)",
  },
];

function FlowConnector({ isVisible }: { isVisible: boolean }) {
  return (
    <div className={styles.connector}>
      <div className={styles.connectorLine}>
        <div
          className={[
            styles.connectorLineInner,
            isVisible ? styles.connectorLineAnimated : "",
          ].join(" ")}
        />
      </div>
      <div className={styles.flowDots}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={[
              styles.flowDot,
              isVisible ? styles.flowDotAnimated : "",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function FlowDiagram() {
  const [visibleNodes, setVisibleNodes] = useState<number[]>([]);
  const [hasAnimated, setHasAnimated] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          flowNodes.forEach((_, index) => {
            setTimeout(() => {
              setVisibleNodes((prev) => [...prev, index]);
            }, index * 300);
          });
        }
      },
      { threshold: 0.2 }
    );

    if (diagramRef.current) {
      observer.observe(diagramRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const allVisible = visibleNodes.length === flowNodes.length;

  return (
    <div ref={diagramRef} className={styles.flowDiagram}>
      <div className="mb-4 text-sm font-semibold text-white">Under the hood</div>

      <div className="space-y-0">
        {flowNodes.map((node, index) => (
          <div key={node.title}>
            <div
              className={[
                styles.flowNode,
                visibleNodes.includes(index) ? styles.flowNodeVisible : "",
                visibleNodes.includes(index) ? styles.flowNodeGlow : "",
              ].join(" ")}
              style={{
                transitionDelay: `${index * 0.1}s`,
                ["--glow-color" as string]: `${node.color}33`,
              }}
            >
              <div
                className={[
                  styles.flowNodeIcon,
                  visibleNodes.includes(index) ? styles.iconPulse : "",
                ].join(" ")}
                style={{
                  backgroundColor: node.bgColor,
                  color: node.color,
                }}
              >
                {node.icon}
              </div>
              <div className={styles.flowNodeContent}>
                <div className={styles.flowNodeTitle}>{node.title}</div>
                <div className={styles.flowNodeLabel}>{node.label}</div>
              </div>
            </div>

            {index < flowNodes.length - 1 && (
              <FlowConnector isVisible={visibleNodes.includes(index + 1)} />
            )}
          </div>
        ))}
      </div>

      <div
        className={[
          "mt-4 flex items-center gap-2 text-xs transition-opacity duration-500",
          allVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <span className="relative flex size-2">
          <span className={`absolute inset-0 rounded-full bg-emerald-400 ${allVisible ? styles.statusPulse : ""}`} />
          <span className="relative size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-emerald-400">All systems operational</span>
      </div>
    </div>
  );
}

function TechCard({ point, index }: { point: TechPoint; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, index * 200);
        }
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="flex items-start gap-4 rounded-2xl bg-zinc-50 p-5 ring-1 ring-black/5"
    >
      <CircularProgress progress={point.progress} color={point.color} isVisible={isVisible}>
        {point.icon}
      </CircularProgress>
      <div className="flex-1 pt-1">
        <div className="text-sm font-semibold text-black">{point.title}</div>
        <div className="mt-1 text-sm text-black/70">{point.body}</div>
      </div>
    </div>
  );
}

export function TechCredibility() {
  return (
    <Section id="tech" className="bg-white">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            Engineered, not improvised
          </h2>
          <p className="mt-3 text-base text-black/70">
            We&apos;re applying real production experience to event management — reliability,
            performance, and operational sanity from day one.
          </p>

          <div className="mt-8 grid gap-4">
            {points.map((point, index) => (
              <TechCard key={point.title} point={point} index={index} />
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-zinc-950 shadow-sm">
          <FlowDiagram />
        </div>
      </div>
    </Section>
  );
}
