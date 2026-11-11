import { X } from "lucide-react";
import { type CSSProperties, useMemo, useRef, useState } from "react";
import { formatClock } from "../../../engine/time";
import { avatarKey } from "../../../game/images";
import { confirm, tick } from "../../../ui/haptics";
import { useSheetDialog } from "../../../ui/useSheetDialog";
import type { Plan, PlannedUpgrade } from "../../../village/plan";
import { helperPreview } from "../../../village/potion";
import type { Scenario } from "../../../village/scenario";
import { helperKindOf } from "../../../village/scenario";
import type { Account } from "../../../village/types";
import { LANE_NAMES, laneKind, when } from "../format";
import { helperArtOf, leftNow, levelStep, progressOf, showsGear } from "../rows";
import { ArtImage } from "./ArtImage";
import { Countdown } from "./Countdown";
import { GearMark } from "./GearMark";
import { HelperPreview } from "./HelperPreview";
import { LaneIcon } from "./LaneIcon";
import styles from "./UpgradeSheet.module.css";
import { UpgradeTimeline } from "./UpgradeTimeline";

interface Props {
  upgrade: PlannedUpgrade | null;
  plan: Plan;
  account: Account;
  scenario: Scenario;
  now: number;
  onClose: () => void;
}

export function UpgradeSheet({ upgrade, plan, account, scenario, now, onClose }: Props) {
  const sheet = useSheetDialog(upgrade !== null);
  // The upgrade is cleared the moment the sheet is dismissed, so the last one is kept while the sheet slides away.
  const last = useRef(upgrade);
  if (upgrade) last.current = upgrade;
  const shown = upgrade ?? (sheet.mounted ? last.current : null);

  const body = shown && (
    // The key gives every upgrade a fresh preview, and closing the sheet unmounts the body, so a preview never lingers.
    <SheetBody
      key={shown.key}
      upgrade={shown}
      plan={plan}
      account={account}
      scenario={scenario}
      now={now}
      onClose={sheet.close}
    />
  );

  return (
    // A click on the backdrop lands on the dialog element itself, not on anything inside it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog.
    <dialog
      {...sheet.props}
      className={styles.sheet}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && sheet.close()}
    >
      {body}
    </dialog>
  );
}

function SheetBody({
  upgrade: planned,
  plan,
  account,
  scenario,
  now,
  onClose,
}: Omit<Props, "upgrade"> & { upgrade: PlannedUpgrade }) {
  const [trying, setTrying] = useState(false);
  const preview = useMemo(() => helperPreview(account, planned, scenario), [account, planned, scenario]);
  // While trying, every number below is read from the what-if copy of the upgrade; the page's own plan is untouched.
  const u = trying && preview ? preview.trial : planned;
  const rel = now - plan.exportedAt;
  const progress = u.likelyDone ? 1 : progressOf(u, plan.exportedAt, now);
  const baseLeft = u.likelyDone ? 0 : leftNow(u, plan.exportedAt, now);
  const realLeft = Math.max(0, u.finishAt - now);
  const helperArt = helperArtOf(account.helpers, u.lane);
  const kind = helperKindOf(u.lane);
  const helper = kind ? account.helpers[kind] : null;
  const turnsOf = (x: PlannedUpgrade) =>
    x.windows
      .filter((w) => w.source === "helper" && w.end > rel)
      .sort((a, b) => a.start - b.start)
      .slice(0, 4);
  const turns = turnsOf(u);
  // The most rows either version of this upgrade shows. The list's box is kept that tall, so flipping the preview
  // never changes the height of the sheet, and with it nothing above moves.
  const rows = Math.max(turnsOf(planned).length, preview ? turnsOf(preview.trial).length : 0);

  return (
    <div className={styles.body} data-kind={laneKind(u.lane)}>
      <header className={styles.head}>
        {/* A unit's wide body picture lives in the before and after card; its square avatar is the better mark here. */}
        <ArtImage imageKey={avatarKey(u.image, u.kind)} kind={u.kind} size={64} muted={u.firstBuild} />
        <div>
          <h2>
            {u.name}
            {showsGear(u) && <GearMark size={18} />}
          </h2>
          <p className={styles.meta}>
            <span>{levelStep(u)}</span>
            <span className={styles.laneChip}>
              <LaneIcon lane={u.lane} size={18} />
              {LANE_NAMES[u.lane]}
            </span>
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.when}>
        <p className={styles.finish}>
          <strong data-done={u.likelyDone || undefined}>
            {u.likelyDone ? "Probably done" : <Countdown at={u.finishAt} />}
          </strong>
          <span>
            {when(u.finishAt, now)}
            <em className={styles.chip} data-on={trying} aria-hidden={!trying}>
              Preview
            </em>
          </span>
        </p>
        {u.nextImage !== u.image && <LookStage key={u.key} upgrade={u} />}
      </div>

      {progress !== null && (
        <div className={styles.progress}>
          {/* biome-ignore lint/a11y/useSemanticElements: a custom-styled bar; the native <meter> cannot be styled consistently across browsers */}
          <div
            className={styles.track}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Progress"
          >
            <span style={{ "--p": progress } as CSSProperties} />
          </div>
          <span className={styles.pct} aria-hidden="true">
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}

      <UpgradeTimeline key={u.key} upgrade={u} exportedAt={plan.exportedAt} now={now} helperArt={helperArt} />

      <dl className={styles.facts}>
        <div>
          <dt>Normal speed</dt>
          <dd>{formatClock(baseLeft)}</dd>
        </div>
        <div>
          <dt>With boosts</dt>
          <dd>{formatClock(realLeft)}</dd>
        </div>
        <div>
          <dt>You save</dt>
          <dd className={styles.good}>{formatClock(Math.max(0, baseLeft - realLeft))}</dd>
        </div>
      </dl>

      {preview && (
        <HelperPreview
          preview={preview}
          art={helperArt}
          trying={trying}
          now={now}
          onToggle={() => {
            confirm();
            setTrying((on) => !on);
          }}
        />
      )}

      {helper && rows > 0 && (
        <section>
          <h3>{helper.name}</h3>
          <div className={styles.turnsBox} style={{ "--rows": rows } as CSSProperties}>
            {turns.length > 0 ? (
              <ul className={styles.turns}>
                {turns.map((t) => (
                  <li key={t.start}>
                    <span>{t.start <= rel ? "Now" : when(plan.exportedAt + t.start, now)}</span>
                    <span>
                      {formatClock(t.end - Math.max(t.start, rel))} at +{t.bonus}x
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noTurns}>{helper.name} is not used on this upgrade.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * The picture the upgrade is heading for, in the space beside the countdown. It shows the new look and a two-way switch
 * under it flips to the current one, so the two are never on screen at once but one press apart.
 */
function LookStage({ upgrade: u }: { upgrade: PlannedUpgrade }) {
  const [after, setAfter] = useState(true);
  const show = (next: boolean) => {
    if (next === after) return;
    tick();
    setAfter(next);
  };
  const names = u.gearUp ? ["Now", "Geared"] : [`Lv ${u.fromLevel}`, `Lv ${u.toLevel}`];
  return (
    <div className={styles.look}>
      <button
        type="button"
        className={styles.stage}
        aria-label={after ? "Show how it looks now" : "Show how it looks after"}
        onClick={() => show(!after)}
      >
        {/* Both pictures are always there and trade places, so the change is a crossfade, not a swap. */}
        <span className={styles.face} data-shown={!after}>
          <ArtImage imageKey={u.image} kind={u.kind} size={80} />
        </span>
        <span className={styles.face} data-shown={after}>
          <ArtImage imageKey={u.nextImage} kind={u.kind} size={80} />
        </span>
      </button>
      <fieldset className={styles.switch} style={{ "--i": after ? 1 : 0 } as CSSProperties}>
        <legend className="sr-only">How it looks</legend>
        {names.map((label, i) => (
          <button key={label} type="button" aria-pressed={after === (i === 1)} onClick={() => show(i === 1)}>
            {label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
