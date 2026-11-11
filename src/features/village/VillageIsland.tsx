import { Share2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { copyText } from "../../native/clipboard";
import { shareOnPhone } from "../../native/share";
import { Disclosure } from "../../ui/Disclosure";
import { tick } from "../../ui/haptics";
import { Toaster } from "../../ui/Toaster";
import { toast } from "../../ui/toast";
import { useSwipeTabs } from "../../ui/useSwipeTabs";
import { useTabDirection } from "../../ui/useTabDirection";
import type { Lane } from "../../village/types";
import { AccountBar } from "./components/AccountBar";
import { BoostPanel } from "./components/BoostPanel";
import { ImportEmpty } from "./components/ImportEmpty";
import { ImportProblem } from "./components/ImportProblem";
import { LaneSection } from "./components/LaneSection";
import { NextUp } from "./components/NextUp";
import { PasteDialog } from "./components/PasteDialog";
import { Schedule } from "./components/Schedule";
import { UpgradeSheet } from "./components/UpgradeSheet";
import { VillageSkeleton } from "./components/VillageSkeleton";
import { TAB_IDS, type Tab, VillageTabs } from "./components/VillageTabs";
import { COPY } from "./copy";
import { nextToFinish } from "./next";
import { helperArtOf } from "./rows";
import { shareText } from "./shareText";
import { type ImportIntent, useMyVillage } from "./useMyVillage";
import { usePasteAnywhere } from "./usePasteAnywhere";
import { useStatusTitle } from "./useStatusTitle";
import { useStickyColumn } from "./useStickyColumn";
import styles from "./VillageIsland.module.css";

const HOME_LANES: Lane[] = ["builder", "lab", "pet"];
const BB_LANES: Lane[] = ["bbBuilder", "bbLab"];

/**
 * The Toaster lives out here, above every screen. Toasts are published from the village hooks, and some of them
 * ("Added", "Forgot … Undo") are published while the empty or loading screen is what's showing. A Toaster that only
 * existed on the loaded screen missed those, or showed them late, once the loaded screen finally mounted.
 */
export default function VillageIsland() {
  return (
    <>
      <VillageScreen />
      <Toaster />
    </>
  );
}

function VillageScreen() {
  const village = useMyVillage();
  const [tab, setTab] = useState<Tab>("workers");
  // The panels only ease in after a tab was chosen, so opening the page on Workers stays still.
  const [switched, setSwitched] = useState(false);
  const showTab = (next: Tab) => {
    if (next === tab) return;
    setSwitched(true);
    setTab(next);
    tick();
  };
  // Builder Base is a drawer; linking to a lane inside it has to open it first.
  const [bbOpen, setBbOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteReason, setPasteReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // True once the empty screen has been shown, so only a village that arrives from it eases in.
  const cameFromEmpty = useRef(false);
  const workersRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const shown = !!village.plan;
  useStickyColumn(workersRef, shown);
  useStickyColumn(sideRef, shown);

  const { plan, basePlan, account, scenario, now } = village;
  const panelsRef = useRef<HTMLDivElement>(null);
  const direction = useTabDirection(TAB_IDS.indexOf(tab));
  useStatusTitle(plan ? nextToFinish(plan) : undefined, now);
  useSwipeTabs(panelsRef, TAB_IDS, tab, showTab, shown);

  // Only on the empty screen: once a village is open, a stray paste shouldn't replace it.
  usePasteAnywhere(village.status === "empty" && !pasteOpen, village.importText);

  const earlierBy = useMemo(() => {
    if (!plan || !basePlan || !village.planning) return {};
    const before = new Map(basePlan.upgrades.map((u) => [u.key, u.finishAt]));
    return Object.fromEntries(
      plan.upgrades.map((u) => [u.key, Math.max(0, (before.get(u.key) ?? u.finishAt) - u.finishAt)]),
    );
  }, [plan, basePlan, village.planning]);

  async function fromClipboard(intent: ImportIntent = "update") {
    setBusy(true);
    const outcome = await village.importClipboard(intent);
    setBusy(false);
    if (outcome === "blocked") openPaste(COPY.clipboardBlocked);
    if (outcome === "unsupported") openPaste(COPY.clipboardUnsupported);
    if (outcome === "same") toast(COPY.sameVillage, { tone: "neutral" });
  }

  function openPaste(reason: string | null) {
    village.clearError();
    setPasteReason(reason);
    setPasteOpen(true);
  }

  function jump(lane: Lane) {
    showTab("workers");
    // A lane in the Builder Base is inside a drawer that takes a moment to open; scroll once it has.
    const closedDrawer = BB_LANES.includes(lane) && !bbOpen;
    if (closedDrawer) setBbOpen(true);
    window.setTimeout(
      () => document.getElementById(`lane-${lane}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      closedDrawer ? 340 : 0,
    );
  }

  if (village.status === "loading") {
    return <VillageSkeleton />;
  }

  const paste = (
    <PasteDialog
      open={pasteOpen}
      error={village.error}
      reason={pasteReason}
      onSubmit={village.importText}
      onClose={() => setPasteOpen(false)}
    />
  );

  // The dialog is always the second child of the same fragment, so it keeps its place (and its state) when the
  // screen above it changes from the import screen to a village. Moving it between parents would remount it.
  if (village.status === "empty" || !plan || !account) {
    cameFromEmpty.current = true;
    return (
      <>
        <ImportEmpty
          busy={busy}
          error={pasteOpen ? null : village.error}
          onClipboard={() => fromClipboard()}
          onText={() => openPaste(null)}
          onSample={village.importSample}
        />
        {paste}
      </>
    );
  }

  async function shareSchedule() {
    if (!plan) return;
    const text = shareText(plan.upgrades, now);
    try {
      // On a phone the share sheet is the natural way to send it; elsewhere it goes to the clipboard.
      if (!(await shareOnPhone(text))) {
        await copyText(text);
        toast("Copied your upgrades. Paste them in a chat.", { tone: "success" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Couldn’t copy that. Try again.", { tone: "warning" });
    }
  }

  const byLane = (lane: Lane) => plan.upgrades.filter((u) => u.lane === lane);
  const summary = (lane: Lane) => plan.lanes.find((l) => l.lane === lane);
  const visible = (lane: Lane) => {
    const s = summary(lane);
    return !!s && (s.capacity !== null || byLane(lane).length > 0);
  };
  const open = plan.upgrades.find((u) => u.key === openKey) ?? null;
  // Rows still in the lane (even finished ones) decide whether the section shows; only running ones count as upgrading.
  const bbRows = BB_LANES.reduce((sum, l) => sum + byLane(l).length, 0);
  const bbCount = BB_LANES.reduce((sum, l) => sum + byLane(l).filter((u) => !u.likelyDone).length, 0);

  const lane = (l: Lane) => {
    const s = summary(l);
    return s && visible(l) ? (
      <LaneSection
        key={l}
        summary={s}
        upgrades={byLane(l)}
        exportedAt={plan.exportedAt}
        now={now}
        earlierBy={earlierBy}
        helperArt={helperArtOf(account.helpers, l)}
        onOpen={setOpenKey}
      />
    ) : null;
  };

  return (
    <>
      <div
        className={styles.shell}
        data-tab={tab}
        data-switched={switched || undefined}
        data-direction={direction}
        data-arrived={cameFromEmpty.current || undefined}
      >
        {village.error && !pasteOpen && (
          <ImportProblem
            message={village.error}
            onPasteText={() => openPaste(null)}
            onDismiss={village.clearError}
          />
        )}
        <AccountBar
          tag={account.tag}
          townHall={account.townHall}
          age={Math.max(0, now - plan.exportedAt)}
          now={now}
          warnings={plan.warnings}
          villages={village.villages}
          busy={busy}
          onUpdate={() => fromClipboard()}
          onSwitch={village.switchTo}
          onAdd={() => fromClipboard("add")}
          onForget={village.forget}
        />
        <NextUp
          plan={plan}
          now={now}
          planning={village.planning}
          onJump={jump}
          onReset={village.resetScenario}
        />
        <VillageTabs value={tab} onChange={showTab} />

        <div ref={panelsRef} className={styles.panels}>
          <section
            ref={workersRef}
            className={styles.workers}
            data-panel="workers"
            id="panel-workers"
            role="tabpanel"
            aria-labelledby="tab-workers"
          >
            {HOME_LANES.map(lane)}
            {bbRows > 0 && (
              <Disclosure
                className={styles.bb}
                open={bbOpen}
                onOpenChange={setBbOpen}
                trigger={
                  <>
                    Builder Base <span>{bbCount} upgrading</span>
                  </>
                }
              >
                <div className={styles.bbBody}>{BB_LANES.map(lane)}</div>
              </Disclosure>
            )}
          </section>
          <div ref={sideRef} className={styles.side}>
            <section
              className={styles.schedule}
              data-panel="schedule"
              id="panel-schedule"
              role="tabpanel"
              aria-labelledby="tab-schedule"
            >
              <div className={styles.headRow}>
                <h2 className={styles.heading}>Coming up</h2>
                <button type="button" className={styles.share} onClick={shareSchedule}>
                  <Share2 size={16} aria-hidden="true" />
                  Share
                </button>
              </div>
              <Schedule plan={plan} now={now} helpers={account.helpers} clockTower={account.clockTower} />
            </section>
            <section
              className={styles.boosts}
              data-panel="boosts"
              id="panel-boosts"
              role="tabpanel"
              aria-labelledby="tab-boosts"
            >
              <h2 className={styles.heading}>Boosts and helpers</h2>
              <BoostPanel
                account={account}
                scenario={scenario}
                now={now}
                onPotion={village.setPotion}
                onOpenUpgrade={setOpenKey}
              />
            </section>
          </div>
        </div>

        <UpgradeSheet
          upgrade={open}
          plan={plan}
          account={account}
          scenario={scenario}
          now={now}
          onClose={() => setOpenKey(null)}
        />
      </div>
      {paste}
    </>
  );
}
