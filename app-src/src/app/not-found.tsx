import { BASE } from '@/lib/config';

export default function NotFound() {
  return (
    <div className="fullscreen-center soft-bg">
      <div className="card stack center" style={{ maxWidth: 380, alignItems: 'center' }}>
        <div style={{ fontSize: 44 }}>💌</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>הדף לא נמצא</div>
        <p className="muted">ייתכן שהקישור הוקלד לא נכון. לאישור הגעה, פתחו את הקישור האישי שקיבלתם בהודעה.</p>
        <a className="btn btn-primary" href={`${BASE}/admin.html`}>לעמוד הראשי</a>
      </div>
    </div>
  );
}
