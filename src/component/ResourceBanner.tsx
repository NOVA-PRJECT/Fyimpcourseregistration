import styles from './resource-banner.module.css'

export default function ResourceBanner() {
  return (
    <a
      href="https://fyimphub.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.banner}
    >
      <div className={styles.bannerLeft}>
        <span className={styles.bannerIcon}>🎓</span>
        <div>
          <p className={styles.bannerTitle}>FYIMP Resource Hub</p>
          <p className={styles.bannerSubtitle}>
            Study materials, notes and resources for all semesters
          </p>
        </div>
      </div>
      <span className={styles.bannerArrow}>→</span>
    </a>
  )
}