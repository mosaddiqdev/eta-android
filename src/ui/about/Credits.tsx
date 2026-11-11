import { ExternalLink, Info } from "lucide-react";
import { type ReactNode, useState } from "react";
import { gameData } from "../../game/meta";
import styles from "../AboutSheet.module.css";
import { Block } from "./Block";
import { ago, dateFormat } from "./gameDataAge";

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ExternalLink size={14} aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const BUILT_WITH: [string, string, string, string][] = [
  ["Astro", "MIT", "https://astro.build", "The site"],
  ["React", "MIT", "https://react.dev", "The interactive pages"],
  ["Lucide", "ISC", "https://lucide.dev", "Icons"],
  ["Plus Jakarta Sans", "SIL OFL", "https://fonts.google.com/specimen/Plus+Jakarta+Sans", "Text"],
  ["JetBrains Mono", "SIL OFL", "https://www.jetbrains.com/lp/mono/", "Timers and numbers"],
];

export function Credits() {
  const [now] = useState(() => new Date());
  const added = new Date(gameData.builtAt);
  const released = gameData.publishedAt ? new Date(gameData.publishedAt) : null;
  return (
    <>
      <div className={styles.notice}>
        <Info size={20} aria-hidden="true" />
        <p>
          ClashETA is an unofficial fan tool. It is not affiliated with, endorsed or sponsored by Supercell.
          Clash of Clans is a trademark of Supercell.
        </p>
      </div>

      <Block id="supercell" title="Supercell">
        <p>
          The game, its characters and every picture on this site belong to Supercell. This site follows the{" "}
          <Link href="https://supercell.com/en/fan-content-policy/">Supercell Fan Content Policy</Link>.
        </p>
      </Block>

      <Block id="data" title="Game data">
        <p>
          Upgrade times, costs, boost speeds and the pictures all come from{" "}
          <Link href="https://github.com/chiefpansancolt/clash-of-clans-data">clash-of-clans-data</Link>, a
          community package built from the wiki. It is MIT licensed. I resized the pictures and saved them as
          WebP.
        </p>
        <p>
          ClashETA&apos;s own part is the arithmetic: it combines those numbers to work out when each upgrade
          finishes.
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Data version</dt>
            <dd>v{gameData.version}</dd>
          </div>
          {released && (
            <div>
              <dt>Data released</dt>
              <dd>
                {dateFormat.format(released)}
                <small>{ago(released, now)}</small>
              </dd>
            </div>
          )}
          <div>
            <dt>Site last built</dt>
            <dd>
              {dateFormat.format(added)}
              <small>{ago(added, now)}</small>
            </dd>
          </div>
        </dl>
        <p className={styles.note}>
          New buildings and levels show up when the package publishes them. Until then, anything missing still
          shows with the right timer.
        </p>
      </Block>

      <Block id="built" title="Built with">
        <ul className={styles.tools}>
          {BUILT_WITH.map(([name, license, href, use]) => (
            <li key={name}>
              <Link href={href}>{name}</Link>
              <span>{use}</span>
              <small>{license}</small>
            </li>
          ))}
        </ul>
      </Block>
    </>
  );
}
