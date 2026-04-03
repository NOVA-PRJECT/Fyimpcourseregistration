import styles from '../app/dashboard/student/student-dashboard.module.css'

export default function StudentPlaceholderSlots() {
      return (
      <>
      <div className={styles.placeholderBanner}>
        
        <p className={styles.placeholderBannerText}>
          Click <strong>Register →</strong> to load your courses
        </p>
        <span className={styles.placeholderBannerIcon}>👆</span>
      </div>

      <p className={styles.sectionTitle}>Course Registration</p>
      <div className={styles.slotsContainer}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={`${styles.slotCard} ${styles.greyed}`}>
            <div className={styles.slotHeader}>
              <span className={styles.slotLabel}>Paper {i}</span>
            </div>
            <div className={styles.greyedSlot}>
              <div
                className={styles.greyedBar}
                style={{ width: `${50 + i * 8}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  
  )
}