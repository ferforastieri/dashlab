import { useEffect, useState } from 'react';
import { SiteTools, type Language, type Theme } from './SiteTools';

type ChromeProps = { language: Language; theme: Theme; text: (pt: string, en: string) => string; toggleLanguage: () => void; toggleTheme: () => void };

export function PublicHeader({ language, theme, text, toggleLanguage, toggleTheme, compact = false, sectionLabel }: ChromeProps & { compact?: boolean; sectionLabel?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (compact) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [compact]);
  const close = () => setMenuOpen(false);
  const prefix = compact ? '/?': '';
  return <header className={`${compact ? 'docs-header' : 'site-header'} ${scrolled ? 'is-scrolled' : ''}`} data-header>
    <a className="brand" href={compact ? '/' : '#inicio'} onClick={close} aria-label="DashLab+">
      <span><img src="/logo.svg" alt="" /></span><strong>DASHLAB+</strong><small>{sectionLabel || (compact ? 'DOCUMENTATION' : 'PERSONAL NODE')}</small>
    </a>
    {!compact && <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label={text('Abrir menu', 'Open menu')} onClick={() => setMenuOpen((open) => !open)}><span /><span /></button>}
    <nav className={menuOpen ? 'is-open' : ''} aria-label={text('Navegação principal', 'Main navigation')}>
      {!compact && <><a href="#recursos" onClick={close}>{text('Recursos', 'Features')}</a><a href="#arquitetura" onClick={close}>{text('Arquitetura', 'Architecture')}</a><a href="#instalacao" onClick={close}>{text('Instalação', 'Installation')}</a></>}
      {compact && <><a href="/">{text('Início', 'Home')}</a><a href={`${prefix}#recursos`}>{text('Recursos', 'Features')}</a><a href={`${prefix}#arquitetura`}>{text('Arquitetura', 'Architecture')}</a><a href={`${prefix}#instalacao`}>{text('Instalação', 'Installation')}</a></>}
      <a href="/docs/">{text('Documentação', 'Documentation')}</a><a href="/releases/">Releases</a><a href="https://github.com/ferforastieri/dashlab">GitHub</a>
    </nav>
    <SiteTools language={language} theme={theme} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />
    {!compact && <a className="header-cta" href="#instalacao">{text('Ver instalação', 'See installation')} <span>→</span></a>}
    {compact && <a href="https://github.com/ferforastieri/dashlab">GitHub ↗</a>}
  </header>;
}

export function PublicFooter({ language, text, compact = false }: Pick<ChromeProps, 'language' | 'text'> & { compact?: boolean }) {
  if (compact) return <footer className="docs-footer"><p>{text('DashLab+ · documentação single-user', 'DashLab+ · single-user documentation')}</p><a href="/">{text('← Voltar para a apresentação', '← Back to the presentation')}</a></footer>;
  return <footer className="site-footer"><a className="brand footer-brand" href="/#inicio"><span><img src="/logo.svg" alt="" /></span><strong>DASHLAB+</strong><small>PERSONAL NODE</small></a><p>{text('Dashboard pessoal para homelabs.', 'A personal dashboard for homelabs.')}</p><nav><a href="/docs/">{text('Documentação', 'Documentation')}</a><a href="/releases/">Releases</a><a href="https://github.com/ferforastieri/dashlab">GitHub</a><a href="/#inicio">{text('Voltar ao topo ↑', 'Back to top ↑')}</a></nav><small>© {new Date().getFullYear()} DashLab+ · Self-hosted</small></footer>;
}
