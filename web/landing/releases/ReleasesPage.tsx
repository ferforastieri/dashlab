import { SiteTools, useSitePreferences } from '../shared/SiteTools';

export function ReleasesPage() {
  const { language, theme, text, toggleLanguage, toggleTheme } = useSitePreferences({
    pt: 'Releases — DashLab+',
    en: 'Releases — DashLab+',
  });
  return (
    <>
      <header className="docs-header">
        <a className="brand" href="/">
          <span><img src="/logo.svg" alt="" /></span>
          <strong>DASHLAB+</strong>
          <small>RELEASES</small>
        </a>
        <SiteTools language={language} theme={theme} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />
        <a href="https://github.com/ferforastieri/dashlab/releases">GitHub ↗</a>
      </header>
      <main className="docs-content releases-page">
        <div className="docs-hero">
          <p className="eyebrow"><span /> RELEASES</p>
          <h1>{text('Versões publicadas.', 'Published versions.')}</h1>
          <p>{text('Histórico de versões, imagens Docker e mudanças do DashLab+.', 'Version history, Docker images, and changes for DashLab+ .')}</p>
        </div>
        <section>
          <p className="doc-index">LATEST</p>
          <h2>{text('Sempre atualizado.', 'Always current.')}</h2>
          <p>{text('Cada publicação na branch principal gera uma nova imagem no GHCR e um release no GitHub. Consulte as notas completas no repositório.', 'Every publication on the main branch creates a new GHCR image and a GitHub release. Read the complete notes in the repository.')}</p>
          <a className="button primary" href="https://github.com/ferforastieri/dashlab/releases">{text('Ver releases no GitHub', 'View GitHub releases')} <span>↗</span></a>
        </section>
      </main>
    </>
  );
}
