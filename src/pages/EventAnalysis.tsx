// src/pages/EventAnalysis.tsx
// "Event analysis" page: an event form with no natal data.
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import EventAnalysisPanel from '../components/EventAnalysisPanel';

function EventAnalysisPage() {
  const { t } = useTranslation();

  return (
    <div className="home">
      <Header />

      <section className="hero">
        <div className="container">
          <h1>{t('eventAnalysisPage.title')}</h1>
          <p>{t('eventAnalysisPage.subtitle')}</p>

          <EventAnalysisPanel />
        </div>
      </section>
    </div>
  );
}

export default EventAnalysisPage;
