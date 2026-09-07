"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  User,
  X,
  Sparkles,
  LogIn,
  LogOut,
  Home as HomeIcon,
  Compass,
  Calendar,
  Layers,
  Bookmark,
  Dices,
  Settings,
  ChevronDown,
  Clock,
  Heart,
  Zap,
  ChevronRight,
} from "lucide-react";
import styles from "./Navbar.module.css";
import SearchDialog from "./SearchDialog";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useThemeSimulator, THEME_CONFIGS } from "./ThemeSimulatorProvider";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/seasonal", label: "Seasonal", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/favorites", label: "Favorites", icon: Heart },
];

const POPULAR_ANIME = [
  "anilist-21",
  "anilist-16498",
  "anilist-113415",
  "anilist-101922",
  "anilist-1535",
  "anilist-11061",
  "anilist-154587",
  "anilist-99147",
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const { user, profile, openAuthModal, signOut } = useAuth();
  const { weather, setWeather } = useThemeSimulator();
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click-outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setIsThemeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileOpen(false);
        setIsThemeOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Gliding active-link indicator
  useEffect(() => {
    const activeIdx = NAV_LINKS.findIndex(l =>
      l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)
    );
    const el = linkRefs.current[activeIdx];
    const parent = navRef.current;
    if (el && parent) {
      const pr = parent.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setIndicator({ left: er.left - pr.left, width: er.width, opacity: 1 });
    } else {
      setIndicator(prev => ({ ...prev, opacity: 0 }));
    }
  }, [pathname]);

  const handleOpenSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-search"));
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "k" }));
  }, []);

  const handleSurpriseMe = useCallback(() => {
    router.push(`/anime/${POPULAR_ANIME[Math.floor(Math.random() * POPULAR_ANIME.length)]}`);
  }, [router]);

  const closeMobile = () => setIsMobileMenuOpen(false);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const currentTheme = THEME_CONFIGS[weather];
  const themeKeys = ["sun", "neural", "attractor", "blackhole", "neuro", "quantum"];

  return (
    <>
      {/* ══════════════ MAIN NAVBAR ══════════════ */}
      <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.navInner}>

          {/* LEFT — Logo + Nav Links */}
          <div className={styles.leftSection}>
            <Link href="/" className={styles.logo} onClick={closeMobile} aria-label="NextGen Anime — Home">
              <div className={styles.logoIcon}>
                <Sparkles size={14} strokeWidth={2.5} />
              </div>
              <div className={styles.logoWordmark}>
                <span className={styles.logoMain}>NEXTGEN</span>
                <span className={styles.logoAccent}>ANIME</span>
              </div>
            </Link>

            <div className={styles.logoDivider} aria-hidden="true" />

            <nav className={styles.desktopNav} aria-label="Main navigation" ref={navRef}>
              {/* Gliding pill indicator */}
              <span
                className={styles.navIndicator}
                style={{ left: indicator.left, width: indicator.width, opacity: indicator.opacity }}
                aria-hidden="true"
              />
              {NAV_LINKS.map((link, i) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    ref={el => { linkRefs.current[i] = el; }}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                  >
                    <Icon size={13} className={styles.navLinkIcon} strokeWidth={active ? 2.5 : 2} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* RIGHT — Actions */}
          <div className={styles.rightSection}>

            {/* Search pill */}
            <button className={styles.searchPill} onClick={handleOpenSearch} aria-label="Search anime (Ctrl+K)">
              <Search size={13} strokeWidth={2.5} />
              <span className={styles.searchText}>Search...</span>
              <kbd className={styles.searchKbd}>⌘K</kbd>
            </button>

            {/* Random anime */}
            <button className={styles.actionBtn} onClick={handleSurpriseMe} title="Surprise Me — Random Anime" aria-label="Random anime">
              <Dices size={16} />
            </button>

            {/* Theme picker */}
            <div className={styles.themeWrapper} ref={themeRef}>
              <button
                className={`${styles.themeBtn} ${isThemeOpen ? styles.themeBtnOpen : ""}`}
                onClick={() => setIsThemeOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={isThemeOpen}
                aria-label={`Theme: ${currentTheme?.label}. Click to switch.`}
              >
                <span
                  className={styles.themeDot}
                  style={{ background: currentTheme?.primaryColor || "var(--primary)" }}
                />
                <span className={styles.themeBtnLabel}>{currentTheme?.label || "Theme"}</span>
                <ChevronDown size={11} className={`${styles.chevron} ${isThemeOpen ? styles.chevronOpen : ""}`} />
              </button>

              {isThemeOpen && (
                <div className={styles.themePanel} role="menu" aria-label="Theme options">
                  <div className={styles.themePanelHead}>
                    <Sparkles size={11} />
                    <span>Visual Themes</span>
                  </div>
                  {themeKeys.map(key => {
                    const cfg = THEME_CONFIGS[key];
                    const active = weather === key;
                    return (
                      <button
                        key={key}
                        role="menuitem"
                        className={`${styles.themeItem} ${active ? styles.themeItemActive : ""}`}
                        onClick={() => { setWeather(key); setIsThemeOpen(false); }}
                        style={active ? { borderColor: cfg?.accentColor, boxShadow: `0 0 12px ${cfg?.accentColor}44` } : {}}
                      >
                        <span
                          className={styles.themeItemDot}
                          style={{ background: cfg?.primaryColor, boxShadow: `0 0 7px ${cfg?.primaryColor}` }}
                        />
                        <div className={styles.themeItemMeta}>
                          <span className={styles.themeItemName}>{cfg?.label}</span>
                          <span className={styles.themeItemSub}>{cfg?.subLabel}</span>
                        </div>
                        {active && <Zap size={10} style={{ color: cfg?.accentColor, marginLeft: "auto", flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profile / Sign In */}
            {user ? (
              <div className={styles.profileWrapper} ref={profileRef}>
                <button
                  className={`${styles.profileBtn} ${isProfileOpen ? styles.profileBtnOpen : ""}`}
                  onClick={() => setIsProfileOpen(v => !v)}
                  aria-haspopup="true"
                  aria-expanded={isProfileOpen}
                  aria-label="Account menu"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username || "Avatar"} className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {(profile?.username?.[0] || "A").toUpperCase()}
                    </div>
                  )}
                  <span className={styles.profileName}>{profile?.username || "Account"}</span>
                  <ChevronDown size={11} className={`${styles.chevron} ${isProfileOpen ? styles.chevronOpen : ""}`} />
                </button>

                {isProfileOpen && (
                  <div className={styles.profilePanel} role="menu" aria-label="Account options">
                    {/* Header */}
                    <div className={styles.profilePanelHead}>
                      <div className={styles.profilePanelAvatarWrap}>
                        {profile?.avatar_url
                          ? <img src={profile.avatar_url} alt="" className={styles.profilePanelAvatarImg} />
                          : <div className={styles.profilePanelAvatarFb}>{(profile?.username?.[0] || "A").toUpperCase()}</div>
                        }
                        <span className={styles.onlineDot} />
                      </div>
                      <div>
                        <div className={styles.profilePanelName}>{profile?.username || "Anime Fan"}</div>
                        <div className={styles.profilePanelEmail}>{user.email}</div>
                      </div>
                    </div>

                    <div className={styles.panelDivider} />

                    {[
                      { href: "/profile", icon: User, label: "My Profile" },
                      { href: "/watchlist", icon: Bookmark, label: "Watchlist" },
                      { href: "/favorites", icon: Heart, label: "Favorites" },
                      { href: "/dashboard", icon: Clock, label: "Watch History" },
                      { href: "/settings", icon: Settings, label: "Settings" },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} className={styles.panelItem} onClick={() => setIsProfileOpen(false)} role="menuitem">
                          <Icon size={14} className={styles.panelItemIcon} />
                          <span>{item.label}</span>
                          <ChevronRight size={11} className={styles.panelItemArrow} />
                        </Link>
                      );
                    })}

                    <div className={styles.panelDivider} />
                    <button
                      className={`${styles.panelItem} ${styles.panelSignOut}`}
                      onClick={() => { signOut(); setIsProfileOpen(false); }}
                      role="menuitem"
                    >
                      <LogOut size={14} className={styles.panelItemIcon} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className={styles.signInBtn} onClick={openAuthModal} aria-label="Sign In">
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            )}

            {/* Hamburger (mobile only) */}
            <button
              className={styles.hamburger}
              onClick={() => setIsMobileMenuOpen(v => !v)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <span className={`${styles.hamLine} ${isMobileMenuOpen ? styles.hamLine1Open : ""}`} />
              <span className={`${styles.hamLine} ${isMobileMenuOpen ? styles.hamLine2Open : ""}`} />
              <span className={`${styles.hamLine} ${isMobileMenuOpen ? styles.hamLine3Open : ""}`} />
            </button>
          </div>
        </div>
        <SearchDialog />
      </header>

      {/* ══════════════ MOBILE DRAWER ══════════════ */}
      <div
        className={`${styles.mobileBackdrop} ${isMobileMenuOpen ? styles.mobileBackdropVisible : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />
      <aside
        className={`${styles.mobileDrawer} ${isMobileMenuOpen ? styles.mobileDrawerOpen : ""}`}
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer head */}
        <div className={styles.drawerHead}>
          <div className={styles.drawerLogo}>
            <div className={styles.logoIcon}><Sparkles size={13} strokeWidth={2.5} /></div>
            <span className={styles.logoMain}>NEXTGEN<span className={styles.logoAccent}>ANIME</span></span>
          </div>
          <button className={styles.drawerClose} onClick={closeMobile} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* User strip */}
        {user && (
          <div className={styles.drawerUserStrip}>
            <div className={styles.drawerUserAvatar}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className={styles.drawerUserAvatarImg} />
                : <div className={styles.drawerUserAvatarFb}>{(profile?.username?.[0] || "A").toUpperCase()}</div>
              }
            </div>
            <div>
              <div className={styles.drawerUserName}>{profile?.username || "Anime Fan"}</div>
              <div className={styles.drawerUserEmail}>{user.email}</div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className={styles.drawerNav} aria-label="Mobile navigation">
          <p className={styles.drawerSectionLabel}>Navigation</p>
          {NAV_LINKS.map(link => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.drawerLink} ${active ? styles.drawerLinkActive : ""}`}
                onClick={closeMobile}
              >
                <Icon size={16} />
                <span>{link.label}</span>
                {active && <span className={styles.drawerActivePip} aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.drawerDivider} />

        {/* Theme grid */}
        <div>
          <p className={styles.drawerSectionLabel}>Visual Theme</p>
          <div className={styles.drawerThemeGrid}>
            {themeKeys.map(key => {
              const cfg = THEME_CONFIGS[key];
              const active = weather === key;
              return (
                <button
                  key={key}
                  className={`${styles.drawerThemeChip} ${active ? styles.drawerThemeChipActive : ""}`}
                  onClick={() => setWeather(key)}
                  style={active ? { borderColor: cfg?.accentColor, color: cfg?.accentColor } : {}}
                >
                  <span className={styles.drawerThemeDot} style={{ background: cfg?.primaryColor }} />
                  {cfg?.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.drawerDivider} />

        {/* Auth */}
        <div className={styles.drawerAuthSection}>
          {user ? (
            <>
              <Link href="/profile" className={styles.drawerLink} onClick={closeMobile}><User size={16} /><span>My Profile</span></Link>
              <Link href="/settings" className={styles.drawerLink} onClick={closeMobile}><Settings size={16} /><span>Settings</span></Link>
              <button className={`${styles.drawerLink} ${styles.drawerSignOut}`} onClick={() => { signOut(); closeMobile(); }}>
                <LogOut size={16} /><span>Sign Out</span>
              </button>
            </>
          ) : (
            <button className={styles.drawerSignIn} onClick={() => { openAuthModal(); closeMobile(); }}>
              <LogIn size={16} /><span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>

      {/* ══════════════ MOBILE BOTTOM DOCK ══════════════ */}
      <nav className={styles.bottomDock} aria-label="Mobile bottom navigation">
        {[
          { href: "/", icon: HomeIcon, label: "Home" },
          { href: "/discover", icon: Compass, label: "Browse" },
          { href: "/calendar", icon: Calendar, label: "Schedule" },
          { href: "/watchlist", icon: Bookmark, label: "Library" },
        ].map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`${styles.dockItem} ${active ? styles.dockItemActive : ""}`}>
              <Icon size={19} />
              <span>{item.label}</span>
              {active && <span className={styles.dockPip} aria-hidden="true" />}
            </Link>
          );
        })}
        <button className={styles.dockSearchBtn} onClick={handleOpenSearch} aria-label="Search anime">
          <Search size={19} />
        </button>
      </nav>
    </>
  );
}