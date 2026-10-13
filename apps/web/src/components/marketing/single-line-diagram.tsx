import * as React from "react";
import { cn } from "@/lib/utils";

/** One feeder or output of a single-line diagram. `label` is the small-caps stage name
 *  ("Feeder 1", "Output 2"), `title` the 21px title, `link` an optional `.link`. */
export type SldNode = { label?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; link?: React.ReactNode };

function Node({ node, headingLevel }: { node: SldNode; headingLevel: "h3" | "h4" }) {
  const H = headingLevel;
  return (
    <div className="sld-node">
      {node.label && <span className="sc">{node.label}</span>}
      <H className="sld-title">{node.title}</H>
      {node.description && <p className="sld-desc">{node.description}</p>}
      {node.link && <p className="sld-link">{node.link}</p>}
    </div>
  );
}

/** Single-line diagram, for processes only (never decorative): feeders in a row above a
 *  4px ink bus with end caps, each on a stem topped by an open circle; outputs hang below the bus on
 *  stems ending in filled squares; the bus label sits under the bus. Vertical on phones.
 *  All copy comes in through props. */
export function SingleLineDiagram({ feeders, bus, outputs, ariaLabel, headingLevel = "h3", className }: {
  feeders: SldNode[];
  /** `name` in ink 600, then " · " and `note`; `meta` (e.g. "1,053 records") on the right */
  bus: { name: React.ReactNode; note?: React.ReactNode; meta?: React.ReactNode };
  outputs: SldNode[];
  ariaLabel?: string;
  headingLevel?: "h3" | "h4";
  className?: string;
}) {
  const cols = Math.max(1, feeders.length + outputs.length);
  return (
    <div role="group" aria-label={ariaLabel} className={cn("sld", className)} style={{ "--sld-cols": cols } as React.CSSProperties}>
      {feeders.map((f, i) => (
        <div key={`f${i}`} className="sld-feed" style={{ "--sld-col": i + 1 } as React.CSSProperties}>
          <Node node={f} headingLevel={headingLevel} />
        </div>
      ))}
      <div className="sld-bus" aria-hidden="true" />
      <div className="sld-buslab">
        <span><b>{bus.name}</b>{bus.note && <> · {bus.note}</>}</span>
        {bus.meta && <span className="tabular-nums">{bus.meta}</span>}
      </div>
      {outputs.map((o, i) => (
        <div key={`o${i}`} className="sld-out" style={{ "--sld-col": feeders.length + i + 1 } as React.CSSProperties}>
          <Node node={o} headingLevel={headingLevel} />
        </div>
      ))}
    </div>
  );
}

/** PRISMA flow drawn as a vertical single-line diagram: the main feeder runs down,
 *  each stage is an open circle (the last a filled square) with its small-caps label and a 26px
 *  figure; an exclusion branches off at a right angle to a square terminal. Pass formatted numbers. */
export function PrismaFlow({ stages, ariaLabel, className }: {
  stages: { label: React.ReactNode; value: React.ReactNode; exclusion?: { value: React.ReactNode; label: React.ReactNode } }[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("prisma", className)}>
      <ol>
        {stages.map((s, i) => (
          <li key={i} className={s.exclusion ? "x" : undefined}>
            <div>
              <span className="st">{s.label}</span>
              <span className="n">{s.value}</span>
            </div>
            {s.exclusion && (
              <p className="ex">
                <b>{s.exclusion.value}</b>
                {s.exclusion.label}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Vertical process steps (recommender questions, contribution steps): a 3px ink feeder down the
 *  left, an open circle per stage and a filled square for the last. Children are `SldStep`s. */
export function SldSteps({ children, className, ariaLabel }: { children: React.ReactNode; className?: string; ariaLabel?: string }) {
  return <ol aria-label={ariaLabel} className={cn("sld-steps", className)}>{children}</ol>;
}

/** One stage: small-caps rubric `label` ("Question 2"), `title`, then any content. */
export function SldStep({ label, title, children, className, headingLevel = "h3" }: { label?: React.ReactNode; title?: React.ReactNode; children?: React.ReactNode; className?: string; headingLevel?: "h3" | "h4" }) {
  const H = headingLevel;
  return (
    <li className={cn(className)}>
      {label && <span className="sc mb-1.5">{label}</span>}
      {title && <H className="font-display text-[21px] font-semibold leading-[1.25] tracking-[-0.005em]">{title}</H>}
      {children !== undefined && <div className={cn(title || label ? "mt-3" : undefined)}>{children}</div>}
    </li>
  );
}
