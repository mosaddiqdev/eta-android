import { type ReactNode, useEffect } from "react";
import { artUrl, preloadArtWhenIdle } from "../game/art";
import { FadeImage } from "./FadeImage";
import styles from "./ImportGuide.module.css";

/** Where the thing to tap sits in the screenshot, in percent, so the ring survives any display width. */
interface Target {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
  target: Target;
}

interface Step {
  title: string;
  text: ReactNode;
  shot?: Shot;
}

// Steps 2 and 4 have no picture on purpose: we only show the game's real screens, never a redrawn one.
const STEPS: Step[] = [
  {
    title: "Open Settings",
    text: (
      <>
        In the game’s menu, tap the <b>Settings</b> tab.
      </>
    ),
    shot: {
      src: artUrl("guide/settings-tab"),
      width: 742,
      height: 114,
      alt: "The game’s menu tabs: Social, Inbox and Settings. Settings, on the right, is selected.",
      target: { left: 68, top: 7, width: 31, height: 91 },
    },
  },
  {
    title: "Go to Data Export",
    text: (
      <>
        Tap <b>More Settings</b> at the bottom of the screen, then scroll down until you reach{" "}
        <b>Data Export</b>.
      </>
    ),
  },
  {
    title: "Tap Copy",
    text: (
      <>
        Next to <b>Export Village data in JSON format</b>, tap <b>Copy</b>.
      </>
    ),
    shot: {
      src: artUrl("guide/data-export"),
      width: 1186,
      height: 219,
      alt: "The Data Export section of the game’s settings, with the green Copy button on the right.",
      target: { left: 72, top: 52, width: 27, height: 40 },
    },
  },
  {
    title: "Come back and paste",
    text: (
      <>
        Tap <b>Paste from clipboard</b>. If you are asked to allow paste, tap <b>Allow</b>.
      </>
    ),
  },
];

interface Props {
  /** Pick the level that fits the page this sits on, so the outline stays correct. */
  headingLevel?: 2 | 3;
  className?: string;
}

export function ImportGuide({ headingLevel = 2, className }: Props) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  // The screenshots sit below the fold and load lazily; fetch them while the player reads the top.
  useEffect(() => preloadArtWhenIdle(["guide/settings-tab", "guide/data-export"]), []);
  return (
    <section className={`${styles.guide} ${className ?? ""}`}>
      <Heading className={styles.title}>How to get your village data</Heading>
      <p className={styles.sub}>Do this in Clash of Clans, then come back.</p>
      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step} data-last={index === STEPS.length - 1 || undefined}>
            <span className={styles.marker} aria-hidden="true">
              {index + 1}
            </span>
            <div className={styles.body}>
              <p className={styles.name}>{step.title}</p>
              <p className={styles.text}>{step.text}</p>
              {step.shot && (
                <figure className={styles.shot}>
                  <FadeImage
                    src={step.shot.src}
                    width={step.shot.width}
                    height={step.shot.height}
                    alt={step.shot.alt}
                    radius="0"
                    loading="lazy"
                    decoding="async"
                  >
                    <span
                      className={styles.ring}
                      aria-hidden="true"
                      style={{
                        left: `${step.shot.target.left}%`,
                        top: `${step.shot.target.top}%`,
                        width: `${step.shot.target.width}%`,
                        height: `${step.shot.target.height}%`,
                      }}
                    />
                  </FadeImage>
                </figure>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
