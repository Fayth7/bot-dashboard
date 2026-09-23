import { useState, useEffect } from 'react';

const getCalendar = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/analytics/calendar', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function PnlCalendar({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    getCalendar()
      .then(d => {
        setData(d);
        const months = Object.keys(d.months).sort();
        if (months.length > 0) setCurrentMonth(months[months.length - 1]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!data || !currentMonth) return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <p style={styles.loading}>{loading ? 'Loading...' : 'No data'}</p>
      </div>
    </div>
  );

  const months = Object.keys(data.months).sort();
  const currentIndex = months.indexOf(currentMonth);
  const monthData = data.months[currentMonth];
  const [year, month] = currentMonth.split('-').map(Number);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDayData = selectedDay
    ? data.days[`${currentMonth}-${String(selectedDay).padStart(2, '0')}`]
    : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <p style={styles.modalTitle}>PnL Calendar</p>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Month Navigation */}
        <div style={styles.monthHeader}>
          <button
            style={styles.navBtn}
            onClick={() => { setSelectedDay(null); setCurrentMonth(months[currentIndex - 1]); }}
            disabled={currentIndex === 0}
          >◀</button>
          <div style={styles.monthTitle}>
            <p style={styles.monthName}>{MONTH_NAMES[month - 1]} {year}</p>
            {monthData && (
              <p style={styles.monthSummary}>
                Total:{' '}
                <span style={{ color: monthData.total_net_pnl >= 0 ? '#2e7d32' : '#c62828' }}>
                  {monthData.total_net_pnl >= 0 ? '+' : ''}${monthData.total_net_pnl}
                </span>
                {'  ·  '}Avg:{' '}
                <span style={{ color: monthData.avg_daily_pnl >= 0 ? '#2e7d32' : '#c62828' }}>
                  {monthData.avg_daily_pnl >= 0 ? '+' : ''}${monthData.avg_daily_pnl}/day
                </span>
                {'  ·  '}{monthData.days_tracked} days
              </p>
            )}
          </div>
          <button
            style={styles.navBtn}
            onClick={() => { setSelectedDay(null); setCurrentMonth(months[currentIndex + 1]); }}
            disabled={currentIndex === months.length - 1}
          >▶</button>
        </div>

        {/* Day Names */}
        <div style={styles.dayNames}>
          {DAY_NAMES.map(d => (
            <div key={d} style={styles.dayName}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
            const dayData = data.days[dateStr];
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                style={{
                  ...styles.cell,
                  background: isSelected ? '#1976d2'
                    : dayData ? (dayData.net_pnl >= 0 ? '#e8f5e9' : '#ffebee')
                    : '#f5f5f5',
                  cursor: dayData ? 'pointer' : 'default',
                  border: isSelected ? '1px solid #1565c0' : '1px solid transparent',
                }}
                onClick={() => dayData && setSelectedDay(isSelected ? null : day)}
              >
                <span style={{ ...styles.dayNum, color: isSelected ? '#fff' : '#555' }}>
                  {day}
                </span>
                {dayData && (
                  <span style={{
                    ...styles.dayPnl,
                    color: isSelected ? '#fff'
                      : dayData.net_pnl >= 0 ? '#2e7d32' : '#c62828',
                  }}>
                    {dayData.net_pnl >= 0 ? '+' : ''}${Math.abs(dayData.net_pnl) >= 100
                      ? Math.round(dayData.net_pnl)
                      : dayData.net_pnl}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Day Detail */}
        {selectedDayData && (
          <div style={styles.detail}>
            <div style={styles.detailHeader}>
              <p style={styles.detailDate}>
                {new Date(selectedDayData.date + 'T12:00:00').toLocaleDateString('en', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })}
              </p>
              <p style={{
                ...styles.detailTotal,
                color: selectedDayData.net_pnl >= 0 ? '#2e7d32' : '#c62828'
              }}>
                {selectedDayData.net_pnl >= 0 ? '+' : ''}${selectedDayData.net_pnl}
              </p>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Realized</span>
              <span style={styles.detailValue}>+${selectedDayData.realized_pnl}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Costs</span>
              <span style={{ ...styles.detailValue, color: '#c62828' }}>
                ${selectedDayData.costs}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Closes</span>
              <span style={styles.detailValue}>{selectedDayData.trades_closed}</span>
            </div>
            <div style={styles.divider} />
            {Object.entries(selectedDayData.exchanges).map(([name, ex]) => (
              <div key={name} style={styles.detailRow}>
                <span style={styles.detailLabel}>{name}</span>
                <div style={styles.exRight}>
                  <span style={{
                    ...styles.detailValue,
                    color: ex.net_pnl >= 0 ? '#2e7d32' : '#c62828'
                  }}>
                    {ex.net_pnl >= 0 ? '+' : ''}${ex.net_pnl}
                  </span>
                  <span style={styles.exCloses}>{ex.trades_closed} closes</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1rem',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  modalTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  closeBtn: {
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#555',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: '2rem 0',
    margin: 0,
  },
  monthHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  navBtn: {
    background: 'none',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#555',
  },
  monthTitle: { textAlign: 'center', flex: 1 },
  monthName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 2px',
  },
  monthSummary: {
    fontSize: '0.75rem',
    color: '#888',
    margin: 0,
  },
  dayNames: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: '4px',
  },
  dayName: {
    textAlign: 'center',
    fontSize: '0.625rem',
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    padding: '4px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '3px',
  },
  cell: {
    borderRadius: '6px',
    padding: '4px 2px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '44px',
    justifyContent: 'center',
  },
  dayNum: { fontSize: '0.6875rem', fontWeight: '500', lineHeight: 1 },
  dayPnl: { fontSize: '0.5625rem', fontWeight: '600', lineHeight: 1.3, marginTop: '2px' },
  detail: {
    marginTop: '0.75rem',
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  detailDate: { fontSize: '0.8125rem', fontWeight: '600', color: '#1a1a1a', margin: 0 },
  detailTotal: { fontSize: '1rem', fontWeight: '700', margin: 0 },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
  },
  detailLabel: { fontSize: '0.75rem', color: '#888' },
  detailValue: { fontSize: '0.8125rem', fontWeight: '500', color: '#1a1a1a' },
  divider: { height: '1px', background: '#e0e0e0', margin: '0.5rem 0' },
  exRight: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' },
  exCloses: { fontSize: '0.625rem', color: '#aaa' },
};
