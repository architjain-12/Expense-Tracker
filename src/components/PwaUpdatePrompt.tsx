import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  const update = async () => {
    await updateServiceWorker(true);
  };

  return (
    <div className="pwa-update-banner">
      <div>
        <strong>New TRACE version available</strong>
        <p>
          A new version is ready. Your current page will be
          refreshed when you choose Update.
        </p>
      </div>

      <div className="inline-actions">
        <button
          className="secondary-btn"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>

        <button
          className="primary-btn"
          onClick={() => void update()}
        >
          Update
        </button>
      </div>
    </div>
  );
}