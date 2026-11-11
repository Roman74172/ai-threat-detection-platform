// ===================
// © AngelaMos | 2026
// index.tsx
//
// Dashboard page with stats overview, severity distribution,
// alert feed, and ranked lists
//
// Exports a lazy-loaded Component (displayName
// DashboardPage) that fetches useStats, useModelStatus, and
// useAlerts. Renders a stat row (threats detected, stored,
// high severity count, detection mode), a proportional
// SeverityBar with colored segments and a SeverityLegend,
// a live AlertFeed capped at 360px, and two RankedList
// panels for top source IPs and most attacked paths. Shows
// a WebSocket connection error banner when present. Connects
// to api/hooks/useStats, api/hooks/useModels,
// api/hooks/useAlerts, components/alert-feed,
// components/stat-card
// ===================

import { useAlerts, useModelStatus, useStats } from '@/api/hooks'
import { AlertFeed, StatCard } from '@/components'
import styles from './dashboard.module.scss'

function SeverityBar({
  high,
  medium,
  low,
}: {
  high: number
  medium: number
  low: number
}): React.ReactElement {
  const total = high + medium + low
  if (total === 0) {
    return <div className={styles.severityBarEmpty}>No threats detected</div>
  }

  return (
    <div className={styles.severityBar}>
      <div
        className={styles.severityHigh}
        style={{ width: `${(high / total) * 100}%` }}
      />
      <div
        className={styles.severityMedium}
        style={{ width: `${(medium / total) * 100}%` }}
      />
      <div
        className={styles.severityLow}
        style={{ width: `${(low / total) * 100}%` }}
      />
    </div>
  )
}

function SeverityLegend({
  high,
  medium,
  low,
}: {
  high: number
  medium: number
  low: number
}): React.ReactElement {
  return (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <span className={`${styles.legendDot} ${styles.dotHigh}`} />
        High: {high}
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.legendDot} ${styles.dotMedium}`} />
        Medium: {medium}
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.legendDot} ${styles.dotLow}`} />
        Low: {low}
      </span>
    </div>
  )
}

function RankedList({
  title,
  items,
}: {
  title: string
  items: { label: string; count: number }[]
}): React.ReactElement {
  return (
    <div className={styles.rankedList}>
      <h3 className={styles.rankedTitle}>{title}</h3>
      {items.length === 0 ? (
        <span className={styles.emptyText}>None</span>
      ) : (
        <ol className={styles.rankedItems}>
          {items.map((item) => (
            <li key={item.label} className={styles.rankedItem}>
              <span className={styles.rankedLabel}>{item.label}</span>
              <span className={styles.rankedCount}>{item.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function Component(): React.ReactElement {
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: modelStatus } = useModelStatus()
  const { alerts, isConnected, connectionError } = useAlerts()

  if (statsLoading || !stats) {
    return <div className={styles.loading}>Loading dashboard...</div>
  }

  const { severity_breakdown: sb } = stats

  return (
    <div className={styles.page}>
      <section className={styles.pageIntro}>
        <div>
          <span className={styles.eyebrow}>SECURITY OPERATIONS / OVERVIEW</span>
          <h2 className={styles.introTitle}>Threat intelligence at a glance</h2>
          <p className={styles.introText}>Monitor suspicious web traffic, review detections and track the health of your analysis models.</p>
        </div>
        <div className={`${styles.liveStatus} ${isConnected ? styles.live : styles.disconnected}`}>
          <span className={styles.liveDot} />
          {isConnected ? 'LIVE ALERT STREAM' : 'STREAM DISCONNECTED'}
        </div>
      </section>
      <div className={styles.statRow}>
        <StatCard label="Threats Detected" value={stats.threats_detected} />
        <StatCard label="Threats Stored" value={stats.threats_stored} />
        <StatCard
          label="High Severity"
          value={sb.high}
          sublabel={`of ${stats.threats_detected} total`}
        />
        <StatCard
          label="Detection Mode"
          value={modelStatus?.detection_mode ?? '...'}
          sublabel={modelStatus?.models_loaded ? 'Models loaded' : 'Rules only'}
        />
      </div>

      <section className={styles.analysisPanel}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>RISK DISTRIBUTION</span>
            <h3>Threat severity breakdown</h3>
          </div>
          <span className={styles.panelHint}>{stats.threats_detected.toLocaleString()} detections analysed</span>
        </div>
        <div className={styles.severitySection}>
        <SeverityBar high={sb.high} medium={sb.medium} low={sb.low} />
        <SeverityLegend high={sb.high} medium={sb.medium} low={sb.low} />
        </div>
      </section>

      <div className={styles.bottomRow}>
        <AlertFeed alerts={alerts} isConnected={isConnected} maxHeight="360px" />

        <div className={styles.lists}>
          <RankedList
            title="Top Source IPs"
            items={stats.top_source_ips.map((ip) => ({
              label: ip.source_ip,
              count: ip.count,
            }))}
          />
          <RankedList
            title="Top Attacked Paths"
            items={stats.top_attacked_paths.map((p) => ({
              label: p.path,
              count: p.count,
            }))}
          />
        </div>
      </div>

      {connectionError && <div className={styles.wsError}>{connectionError}</div>}
    </div>
  )
}

Component.displayName = 'DashboardPage'
