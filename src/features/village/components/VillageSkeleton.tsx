import { ChevronDown } from "lucide-react";
import { boneGroup } from "../../../ui/Bone";
import island from "../VillageIsland.module.css";
import account from "./AccountBar.module.css";
import { ArtImage } from "./ArtImage";
import { LaneIcon } from "./LaneIcon";
import lanes from "./LaneSection.module.css";
import next from "./NextUp.module.css";
import rows from "./UpgradeRow.module.css";
import { VillageCrest } from "./VillageCrest";
import styles from "./VillageSkeleton.module.css";
import tabs from "./VillageTabs.module.css";

const LANES = [
  { lane: "builder", rows: 3 },
  { lane: "lab", rows: 2 },
] as const;

/**
 * A village while it is being read, built from the same class names and structure as the real screen and drawn
 * in skeleton mode (styles/skeleton.css). The words are only there to give each bar its real size.
 */
export function VillageSkeleton() {
  return (
    <div className={`${boneGroup} ${island.shell}`} data-tab="workers" data-skeleton aria-hidden="true" inert>
      <header className={account.bar}>
        <div className={account.who}>
          <VillageCrest townHall={null} size="lg" />
          <div className={account.text}>
            <span className={account.tag}>#ABCD1234</span>
            <span className={account.age}>Updated 2 min ago</span>
          </div>
        </div>
        <div className={account.split}>
          <button type="button" className={account.update}>
            Update
          </button>
          <button type="button" className={account.more}>
            <ChevronDown size={18} />
          </button>
        </div>
      </header>

      <section className={next.hero}>
        <div className={next.next} data-kind="builder">
          <ArtImage imageKey={null} kind="unknown" size={64} />
          <span className={next.lane}>
            <LaneIcon lane="builder" size={32} tile />
          </span>
          <div className={next.copy}>
            <p className={next.label}>Next to finish</p>
            <p className={next.name}>Cannon upgrade</p>
            <p className={next.when}>
              <strong>1h 24m 10s</strong>
              <span>Today, 18:30</span>
            </p>
          </div>
        </div>
      </section>

      <div className={tabs.tabs}>
        {["Workers", "Schedule", "Boosts"].map((label) => (
          <span key={label} className={tabs.tab}>
            {label}
          </span>
        ))}
      </div>

      <div className={island.panels}>
        <section className={island.workers} data-panel="workers">
          {LANES.map(({ lane, rows: count }) => (
            <section key={lane} className={lanes.lane} data-kind={lane}>
              <header className={lanes.head}>
                <h2>
                  <LaneIcon lane={lane} size={40} tile />
                  {lane === "builder" ? "Builders" : "Laboratory"}
                </h2>
                <p>3 of 5 busy</p>
              </header>
              <ul className={lanes.list}>
                {Array.from({ length: count }, (_, row) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing, never reordered
                  <li key={row}>
                    <div className={rows.row} data-kind={lane}>
                      <ArtImage imageKey={null} kind="unknown" size={52} />
                      <span className={rows.body}>
                        <span className={rows.top}>
                          <span className={rows.name}>
                            <span className={rows.nameText}>Archer Tower</span>
                          </span>
                          <span className={rows.left}>2d 4h</span>
                        </span>
                        <span className={rows.mid}>
                          <span>Lv 12 → 13</span>
                          <span>Fri, 09:30</span>
                        </span>
                        <span className={rows.track} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
        <section className={`${island.boosts} ${styles.side}`} data-panel="boosts">
          <h2 className={island.heading}>Boosts and helpers</h2>
          <div className={styles.card} />
          <div className={styles.card} />
        </section>
      </div>
    </div>
  );
}
