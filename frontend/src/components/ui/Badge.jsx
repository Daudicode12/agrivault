import styles from './Badge.module.css';

const variants = {
  sell: styles.sell,
  hold: styles.hold,
  strong_hold: styles.strongHold,
  consider_selling: styles.considerSelling,
  up: styles.up,
  down: styles.down,
  neutral: styles.neutral,
  info: styles.info,
  warning: styles.warning,
};

export default function Badge({ variant = 'info', children }) {
  return (
    <span className={`${styles.badge} ${variants[variant] || styles.info}`}>
      {children}
    </span>
  );
}
