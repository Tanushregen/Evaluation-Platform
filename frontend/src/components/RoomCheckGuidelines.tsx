import { Sun, Image, UserRound, MonitorOff } from 'lucide-react';
import poorVsGoodLighting from '../assets/room-check/poor-vs-good-lighting.png';

const CHECKLIST = [
  { icon: Sun, title: 'Good lighting', desc: 'Your face should be clearly visible' },
  { icon: Image, title: 'Plain background', desc: 'Avoid clutter or distractions' },
  { icon: UserRound, title: 'Be visible from head to mid-waist', desc: 'Sit at a comfortable distance' },
  { icon: MonitorOff, title: 'No other people or devices', desc: 'Ensure you are alone in the room' },
];

/** Right-hand guidance panel shown alongside the Room Check video preview. */
export default function RoomCheckGuidelines() {
  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)', height: 'fit-content' }}
    >
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>Room Check Guidelines</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--admin-text-muted)' }}>
        Ensure the following for a smooth assessment experience.
      </p>

      <img
        src={poorVsGoodLighting}
        alt="Poor lighting: avoid dim or backlit rooms. Good lighting: sit in a well-lit area facing a light source."
        className="w-full rounded-xl mb-4"
      />

      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
        {CHECKLIST.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--admin-border)' }}
            >
              <Icon size={14} color="var(--admin-text-muted)" />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
