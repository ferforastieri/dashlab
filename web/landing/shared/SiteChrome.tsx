import { useEffect, useState } from 'react';
import { SiteTools, type Language, type Theme } from './SiteTools';

type ChromeProps = { language: Language; theme: Theme; text: (pt: string, en: string) => string; toggleLanguage: () => void; toggleTheme: () => void };

export function PublicHeader({ language, theme, text, toggleLanguage, toggleTheme, landing = false }: ChromeProps & { landing?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const close = () => setMenuOpen(false);
  const prefix = landing ? '' : '/';
  return <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`} data-header>
    <a className="brand" href={`${prefix}#inicio`} onClick={close} aria-label="DashLab+">
      <span><img src="/logo.png" alt="" /></span><strong>DASHLAB+</strong><small>PERSONAL NODE</small>
    </a>
    <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label={text('Abrir menu', 'Open menu')} onClick={() => setMenuOpen((open) => !open)}><span /><span /></button>
    <nav className={menuOpen ? 'is-open' : ''} aria-label={text('Navegação principal', 'Main navigation')}>
      <a href={`${prefix}#recursos`} onClick={close}>{text('Recursos', 'Features')}</a><a href={`${prefix}#arquitetura`} onClick={close}>{text('Arquitetura', 'Architecture')}</a><a href={`${prefix}#instalacao`} onClick={close}>{text('Instalação', 'Installation')}</a>
      <a href="/docs/" onClick={close}>{text('Documentação', 'Documentation')}</a><a href="/releases/" onClick={close}>Releases</a><a href="https://github.com/ferforastieri/dashlab">GitHub</a>
    </nav>
    <SiteTools language={language} theme={theme} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />
    <a className="header-cta" href={`${prefix}#instalacao`}>{text('Ver instalação', 'See installation')} <span>→</span></a>
  </header>;
}

export function PublicFooter({ text }: Pick<ChromeProps, 'language' | 'text'>) {
  return <footer className="site-footer"><a className="brand footer-brand" href="/#inicio"><span><img src="/logo.png" alt="" /></span><strong>DASHLAB+</strong><small>PERSONAL NODE</small></a><div className="footer-copy"><p>{text('Dashboard pessoal para homelabs.', 'A personal dashboard for homelabs.')}</p><small>© {new Date().getFullYear()} Fernando Forastieri · DashLab+ · <a href="https://github.com/ferforastieri/dashlab/blob/main/LICENSE">{text('Licença MIT', 'MIT License')}</a> · Self-hosted</small></div><nav><a href="/docs/">{text('Documentação', 'Documentation')}</a><a href="/releases/">Releases</a><a href="https://github.com/ferforastieri/dashlab">GitHub</a><a href="/#inicio">{text('Voltar ao topo ↑', 'Back to top ↑')}</a></nav></footer>;
}
