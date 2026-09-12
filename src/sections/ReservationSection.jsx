import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, fadeInLeft, fadeInRight, defaultViewport } from '../animations/variants';
import { submitReservation } from '../services/api';

export default function ReservationSection() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      setError('');
      await submitReservation(data);
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section id="reservation" className="section" aria-label="Réservations">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={defaultViewport} variants={fadeInUp} className="text-center">
          <p className="section-label">Réservations</p>
          <h2 className="section-title">Réservez Votre Expérience</h2>
          <p className="section-subtitle center description">
            Réservez une place au food truck ou engagez-nous pour votre événement privé.
          </p>
        </motion.div>

        <div className="grid-2 mt-48" style={{ alignItems: 'start', gap: '48px' }}>
          <motion.form
            className="glass-card"
            onSubmit={handleSubmit(onSubmit)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            variants={fadeInLeft}
            noValidate
          >
            <div className="form-group">
              <label className="form-label" htmlFor="res-name">Nom</label>
              <input id="res-name" className="form-input" {...register('name', { required: 'Champ requis' })} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="res-phone">Téléphone</label>
                <input id="res-phone" className="form-input" type="tel" {...register('phone', { required: 'Champ requis' })} />
                {errors.phone && <p className="form-error">{errors.phone.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="res-email">E-mail</label>
                <input id="res-email" className="form-input" type="email" {...register('email', { required: 'Champ requis', pattern: { value: /^\S+@\S+\.\S+$/, message: 'E-mail invalide' } })} />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="res-guests">Convives</label>
                <select id="res-guests" className="form-select" {...register('guests', { required: 'Champ requis' })}>
                  <option value="">Choisir</option>
                  {[1,2,3,4,5,6,7,8,9,10,'10+'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                {errors.guests && <p className="form-error">{errors.guests.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="res-date">Date</label>
                <input id="res-date" className="form-input" type="date" {...register('date', { required: 'Champ requis' })} />
                {errors.date && <p className="form-error">{errors.date.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="res-message">Message</label>
              <textarea id="res-message" className="form-textarea" {...register('message')} placeholder="Demandes spéciales, régimes alimentaires..." />
            </div>

            {error && <p className="form-error mb-16">{error}</p>}
            {success && <p className="form-success mb-16">Réservation envoyée ! Nous vous confirmons rapidement.</p>}

            <button type="submit" className="btn btn--primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Envoyer la réservation'}
            </button>
          </motion.form>

          <motion.div initial="hidden" whileInView="visible" viewport={defaultViewport} variants={fadeInRight}>
            <div className="glass-card">
              <h3 style={{ fontSize: 'var(--font-subtitle)', marginBottom: '16px' }}>Événements privés</h3>
              <p className="description" style={{ color: 'var(--steel)', marginBottom: '16px' }}>
                Nous proposons des expériences sushi sur mesure pour vos célébrations privées et festivals.
              </p>
              <ul style={{ listStyle: 'none' }}>
                {['Menus omakase personnalisés', 'Préparation live devant vos invités', 'Coordination complète de l\'événement', 'Minimum 20 convives'].map(item => (
                  <li key={item} style={{ padding: '8px 0', borderBottom: '1px solid rgba(126,148,160,0.15)', fontSize: 'var(--font-small)', letterSpacing: '1px' }}>
                    ✦ {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
