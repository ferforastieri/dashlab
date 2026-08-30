import { useEffect, useState } from 'react';
import { useSitePreferences } from '../shared/SiteTools';
import { PublicFooter, PublicHeader } from '../shared/SiteChrome';

export function ReleasesPage() {
  const { language, theme, text, toggleLanguage, toggleTheme } = useSitePreferences({
    pt: 'Releases — DashLab+',
    en: 'Releases — DashLab+',
  });
  const [releases, setReleases] = useState<Array<{ tag_name: string; name: string; html_url: string; published_at: string; body: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('https://api.github.com/repos/ferforastieri/dashlab/releases?per_page=20', { headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('releases unavailable')))
      .then((data) => setReleases(Array.isArray(data) ? data : []))
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <PublicHeader language={language} theme={theme} text={text} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />
      <main className="docs-content releases-page">
          <div className="docs-hero">
            <p className="eyebrow"><span /> RELEASES</p>
            <h1>{text('Versões publicadas.', 'Published versions.')}</h1>
            <p>{text('Histórico de versões, imagens Docker e mudanças do DashLab+.', 'Version history, Docker images, and changes for DashLab+ .')}</p>
          </div>
          <section className="release-list-section" id="historico">
          <p className="doc-index">HISTORY</p>
          <h2>{text('Histórico de versões.', 'Version history.')}</h2>
          {loading && <p>{text('Carregando releases…', 'Loading releases…')}</p>}
          {!loading && releases.length === 0 && <p>{text('Não foi possível carregar a lista agora. Consulte os releases diretamente no GitHub.', 'The list could not be loaded right now. Check the releases directly on GitHub.')}</p>}
          <div className="release-list">
            {releases.map((release) => <article className="release-card" key={release.tag_name}>
              <div><span className="release-tag">{release.tag_name}</span><time dateTime={release.published_at}>{new Date(release.published_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</time></div>
              <h3>{release.name || release.tag_name}</h3>
              <p>{(release.body || text('Release publicado automaticamente pela pipeline.', 'Release published automatically by the pipeline.')).slice(0, 280)}</p>
              <a href={release.html_url}>{text('Ver detalhes', 'View details')} ↗</a>
            </article>)}
          </div>
          </section>
      </main>
      <PublicFooter language={language} text={text} />
    </>
  );
}
