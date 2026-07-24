import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installChromeMock } from './chrome-mock';

installChromeMock();

// Import after the mock is installed so modules see `chrome`.
import { App as PopupApp } from '@/popup/App';
import { App as OptionsApp } from '@/options/App';
import { BlockOverlay } from '@/overlay/BlockOverlay';
import '@/theme/globals.css';

const params = new URLSearchParams(location.search);
const surface = params.get('surface') ?? 'gallery';

function Gallery() {
  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-semibold">Aperture — preview gallery</h1>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Popup</h2>
            <div className="inline-block overflow-hidden rounded-3xl shadow-elevated">
              <PopupApp />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Block overlay
            </h2>
            <div className="h-[640px] overflow-hidden rounded-3xl shadow-elevated">
              <BlockOverlay />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    {surface === 'popup' ? (
      <PopupApp />
    ) : surface === 'options' ? (
      <OptionsApp />
    ) : surface === 'overlay' ? (
      <BlockOverlay />
    ) : (
      <Gallery />
    )}
  </StrictMode>,
);
