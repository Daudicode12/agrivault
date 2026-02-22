import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await register({ fullName: form.name, email: form.email, password: form.password });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Sprout size={32} className={styles.logo} />
          <h1 className={styles.title}>AgroVault</h1>
          <p className={styles.subtitle}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Full Name
            <input
              type="text"
              className={styles.input}
              placeholder="Jane Wanjiku"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label className={styles.label}>
            Email
            <input
              type="email"
              className={styles.input}
              placeholder="farmer@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </label>

          <label className={styles.label}>
            Confirm Password
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </label>

          <button type="submit" className={styles.btn} disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
