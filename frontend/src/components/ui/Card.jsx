import styles from './Card.module.css';

export default function Card({ children, className = '', glow = false, ...props }) {
  return (
    <div
      className={`${styles.card} ${glow ? styles.glow : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
