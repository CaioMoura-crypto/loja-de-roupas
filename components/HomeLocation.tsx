import type { Settings } from '@/lib/types';
import { mapCenterCoordinates } from '@/lib/location';

export default function HomeLocation({ settings }: { settings: Settings }) {
  const address = settings.locationAddress?.trim();
  if (settings.locationEnabled === false || !address) return null;

  const lines = address.split('\n').map(line => line.trim()).filter(Boolean);
  const destination = lines.join(', ');
  const query = encodeURIComponent(destination);
  const appleRoute = `https://maps.apple.com/directions?destination=${query}`;
  const mapCenter = mapCenterCoordinates(settings.locationMapCenter);

  return (
    <section id="localizacao" className="home-location" aria-labelledby="location-title">
      <div className={`home-location-inner${mapCenter ? '' : ' home-location-inner--without-map'}`}>
        <div className="home-location-copy">
          <h2 id="location-title">{settings.locationTitle || 'Localização'}</h2>
          {settings.locationDescription && <p className="home-location-description">{settings.locationDescription}</p>}
          <address className="home-location-address">
            <strong>{lines[0]}</strong>
            {lines.slice(1).map((line, index) => <span key={index}>{line}</span>)}
          </address>
          {settings.locationHours && <div className="home-location-hours"><h3>Horário de atendimento</h3><p>{settings.locationHours}</p></div>}
          <div className="home-location-actions">
            <a className="solid-button home-location-button home-location-button-secondary" href={appleRoute} target="_blank" rel="noopener noreferrer">Rota no Apple Maps</a>
          </div>
        </div>
        {mapCenter && <div className="home-location-map">
          <iframe
            title={`Google Maps: ${destination}`}
            src={`https://www.google.com/maps?ll=${encodeURIComponent(mapCenter)}&output=embed&hl=pt-BR&z=16`}
            width="800"
            height="440"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>}
      </div>
    </section>
  );
}
