"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, 
  User, 
  Menu, 
  X, 
  Sparkles, 
  LogIn, 
  LogOut, 
  Home as HomeIcon,
  Compass,
  Calendar,
  Layers,
  Bookmark,
  Sun,
  Dices,
  Settings,
  ChevronDown,
  Clock,
  Heart
} from "lucide-react";
import styles from "./Navbar.module.css";
import SearchDialog from "./SearchDialog";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useThemeSimulator, THEME_CONFIGS } from "./ThemeSimulatorProvider";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [fxMode, setFxMode] = useState<"vibrant" | "ambient" | "stealth">("ambient");
  const { user, profile, openAuthModal, signOut } = useAuth();
  const { weather, setWeather } = useThemeSimulator();
  const profileRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedFx = localStorage.getItem("nextgen_fx_mode") as any;
    if (savedFx && ["vibrant", "ambient", "stealth"].includes(savedFx)) {
      setFxMode(savedFx);
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCycleFx = () => {
    const nextMode = fxMode === "vibrant" ? "ambient" : fxMode === "ambient" ? "stealth" : "vibrant";
    setFxMode(nextMode);
    localStorage.setItem("nextgen_fx_mode", nextMode);
    window.dispatchEvent(new CustomEvent("nextgen-fx-change", { detail: { mode: nextMode } }));
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("open-search"));
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "k" }));
  };

  const handleSurpriseMe = () => {
    // Curated high-rated anime IDs for quick jump
    const popularAnime = [
      "anilist-21",      // One Piece
      "anilist-16498",   // Attack on Titan
      "anilist-113415",  // Jujutsu Kaisen
      "anilist-101922",  // Demon Slayer
      "anilist-1535",    // Death Note
      "anilist-11061",   // Hunter x Hunter
      "anilist-154587",  // Frieren
      "anilist-99147",   // Vinland Saga
    ];
    const target = popularAnime[Math.floor(Math.random() * popularAnime.length)];
    router.push(`/anime/${target}`);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          {/* Brand Logo */}
          <div className={styles.left}>
            <Link href="/" className={styles.logo} onClick={closeMobileMenu}>
              <div className={styles.logoBadge}>
                <Sparkles size={16} />
              </div>
              <span className={styles.logoText}>
                NEXTGEN<span className={styles.accent}>ANIME</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className={styles.links} aria-label="Desktop Navigation">
              <Link 
                href="/" 
                className={`${styles.link} ${isNavActive("/") ? styles.activeLink : ""}`}
              >
                <HomeIcon size={14} className={styles.linkIcon} /> Home
              </Link>
              <Link 
                href="/discover" 
                className={`${styles.link} ${isNavActive("/discover") ? styles.activeLink : ""}`}
              >
                <Compass size={14} className={styles.linkIcon} /> Browse
              </Link>
              <Link 
                href="/calendar" 
                className={`${styles.link} ${isNavActive("/calendar") ? styles.activeLink : ""}`}
              >
                <Calendar size={14} className={styles.linkIcon} /> 
                <span>Schedule</span>
                <span className={styles.livePulseDot} title="Live Airing Broadcasts" />
              </Link>
              <Link 
                href="/seasonal" 
                className={`${styles.link} ${isNavActive("/seasonal") ? styles.activeLink : ""}`}
              >
                <Layers size={14} className={styles.linkIcon} /> Seasonal
              </Link>
              <Link 
                href="/watchlist" 
                className={`${styles.link} ${isNavActive("/watchlist") ? styles.activeLink : ""}`}
              >
                <Bookmark size={14} className={styles.linkIcon} /> My Library
              </Link>
            </nav>
          </div>
          
          {/* Right Utilities */}
          <div className={styles.right}>
            {/* Quick Search Pill */}
            <button 
              className={styles.searchPillBtn} 
              onClick={handleOpenSearch}
              title="Search Anime (Ctrl+K)"
              aria-label="Search Anime"
            >
              <Search size={15} />
              <span className={styles.searchPlaceholder}>Search anime...</span>
              <kbd className={styles.searchKbd}>Ctrl K</kbd>
            </button>

            {/* Surprise Me / Random Anime */}
            <button 
              className={styles.iconButton} 
              onClick={handleSurpriseMe} 
              title="Surprise Me (Random Anime)"
              aria-label="Surprise Me"
            >
              <Dices size={18} />
            </button>

            {/* 3D Morphing Simulated Theme Switcher */}
            <div className={styles.themeWrapper} ref={themeMenuRef}>
              <button 
                className={styles.themeToggleBtn} 
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                title={`Active Simulation Theme: ${THEME_CONFIGS[weather]?.label || "Simulation"} (Click to Switch)`}
                aria-label="Toggle 3D Simulated Themes"
              >
                <span 
                  className={styles.themeDot} 
                  style={{ background: THEME_CONFIGS[weather]?.primaryColor || "var(--primary)" }} 
                />
                <span className={styles.themeName}>{THEME_CONFIGS[weather]?.label || "Theme"}</span>
                <ChevronDown size={11} className={styles.dropdownChevron} />
              </button>

              {isThemeMenuOpen && (
                <div className={styles.themeDropdown}>
                  <div className={styles.themeDropdownHeader}>
                    <Sparkles size={13} style={{ color: "var(--accent)" }} />
                    <span>3D Morphing Themes & Typography</span>
                  </div>
                  <div className={styles.themeOptionsGrid}>
                    {["sun", "neural", "attractor", "blackhole", "neuro", "quantum"].map((key) => {
                      const cfg = THEME_CONFIGS[key];
                      const isActive = (THEME_CONFIGS[weather]?.name || weather) === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setWeather(key);
                            setIsThemeMenuOpen(false);
                          }}
                          className={`${styles.themeOption} ${isActive ? styles.activeThemeOption : ""}`}
                          style={isActive ? { borderColor: cfg.accentColor, color: cfg.accentColor } : {}}
                        >
                          <span className={styles.optionDot} style={{ background: cfg.primaryColor }} />
                          <div className={styles.optionText}>
                            <span className={styles.optionLabel}>{cfg.label}</span>
                            <span className={styles.optionSub}>{cfg.fontFamily.split(",")[0].replace(/'/g, "")} • {cfg.subLabel}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Account / Profile */}
            {user ? (
              <div className={styles.profileWrapper} ref={profileRef}>
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} 
                  className={styles.userProfileBtn}
                  aria-label="User Account Menu"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className={styles.userAvatar} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      <User size={15} />
                    </div>
                  )}
                  <span className={styles.usernameText}>{profile?.username || "Account"}</span>
                  <ChevronDown size={12} className={styles.dropdownChevron} />
                </button>

                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.dropdownHeader}>
                      <span className={styles.dropdownName}>{profile?.username || "Anime Enthusiast"}</span>
                      <span className={styles.dropdownEmail}>{user.email}</span>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <Link href="/profile" className={styles.dropdownItem} onClick={() => setIsProfileDropdownOpen(false)}>
                      <User size={15} /> My Profile
                    </Link>
                    <Link href="/watchlist" className={styles.dropdownItem} onClick={() => setIsProfileDropdownOpen(false)}>
                      <Bookmark size={15} /> Watchlist
                    </Link>
                    <Link href="/favorites" className={styles.dropdownItem} onClick={() => setIsProfileDropdownOpen(false)}>
                      <Heart size={15} /> Favorites
                    </Link>
                    <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setIsProfileDropdownOpen(false)}>
                      <Clock size={15} /> Watch History
                    </Link>
                    <Link href="/settings" className={styles.dropdownItem} onClick={() => setIsProfileDropdownOpen(false)}>
                      <Settings size={15} /> Settings
                    </Link>
                    <div className={styles.dropdownDivider} />
                    <button 
                      onClick={() => {
                        signOut();
                        setIsProfileDropdownOpen(false);
                      }} 
                      className={`${styles.dropdownItem} ${styles.dropdownSignOut}`}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={openAuthModal} className={styles.authBtn} aria-label="Sign In">
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button 
              className={`${styles.iconButton} ${styles.mobileMenuToggle}`} 
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <SearchDialog />
      </header>

      {/* Mobile Glass Drawer */}
      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobileMenu}>
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDrawerHeader}>
              <div className={styles.logo}>
                <div className={styles.logoBadge}>
                  <Sparkles size={14} />
                </div>
                <span className={styles.logoText}>
                  NEXTGEN<span className={styles.accent}>ANIME</span>
                </span>
              </div>
              <button 
                className={styles.iconButton} 
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className={styles.mobileLinks} aria-label="Mobile Navigation">
              <Link href="/" className={`${styles.mobileLink} ${pathname === "/" ? styles.activeMobileLink : ""}`} onClick={closeMobileMenu}>
                <HomeIcon size={18} /> Home
              </Link>
              <Link href="/discover" className={`${styles.mobileLink} ${pathname.startsWith("/discover") ? styles.activeMobileLink : ""}`} onClick={closeMobileMenu}>
                <Compass size={18} /> Browse Anime
              </Link>
              <Link href="/calendar" className={`${styles.mobileLink} ${pathname.startsWith("/calendar") ? styles.activeMobileLink : ""}`} onClick={closeMobileMenu}>
                <Calendar size={18} /> Airing Schedule
              </Link>
              <Link href="/seasonal" className={`${styles.mobileLink} ${pathname.startsWith("/seasonal") ? styles.activeMobileLink : ""}`} onClick={closeMobileMenu}>
                <Layers size={18} /> Seasonal Releases
              </Link>
              <Link href="/watchlist" className={`${styles.mobileLink} ${pathname.startsWith("/watchlist") ? styles.activeMobileLink : ""}`} onClick={closeMobileMenu}>
                <Bookmark size={18} /> My Watchlist
              </Link>
              <Link href="/favorites" className={`${styles.mobileLink} ${pathname.startsWith("/favorites") ? styles.activeMobileLink : ""}`} onClick={closeMobileMenu}>
                <Heart size={18} /> Favorites
              </Link>

              <div className={styles.mobileDivider} />

              <div className={styles.mobileFxRow}>
                <span>3D Solar Background</span>
                <button onClick={handleCycleFx} className={styles.mobileFxBtn}>
                  {fxMode.toUpperCase()}
                </button>
              </div>

              <div className={styles.mobileDivider} />

              {user ? (
                <>
                  <Link href="/profile" className={styles.mobileLink} onClick={closeMobileMenu}>
                    <User size={18} /> My Profile ({profile?.username || "Account"})
                  </Link>
                  <button
                    className={`${styles.mobileLink} ${styles.mobileSignOut}`}
                    onClick={() => {
                      signOut();
                      closeMobileMenu();
                    }}
                  >
                    <LogOut size={18} /> Sign Out
                  </button>
                </>
              ) : (
                <button
                  className={`${styles.mobileLink} ${styles.mobileSignIn}`}
                  onClick={() => {
                    openAuthModal();
                    closeMobileMenu();
                  }}
                >
                  <LogIn size={18} /> Sign In / Register
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Floating Spatial Bottom Dock */}
      <nav className={styles.mobileBottomDock} aria-label="Mobile Bottom Navigation">
        <Link 
          href="/" 
          className={`${styles.dockItem} ${pathname === "/" ? styles.activeDockItem : ""}`}
        >
          <HomeIcon size={18} />
          <span>Home</span>
        </Link>
        <Link 
          href="/discover" 
          className={`${styles.dockItem} ${pathname.startsWith("/discover") ? styles.activeDockItem : ""}`}
        >
          <Compass size={18} />
          <span>Browse</span>
        </Link>
        <button 
          className={styles.dockSearchBtn} 
          onClick={handleOpenSearch} 
          aria-label="Search Anime"
        >
          <Search size={18} />
        </button>
        <Link 
          href="/calendar" 
          className={`${styles.dockItem} ${pathname.startsWith("/calendar") ? styles.activeDockItem : ""}`}
        >
          <Calendar size={18} />
          <span>Schedule</span>
        </Link>
        <Link 
          href="/watchlist" 
          className={`${styles.dockItem} ${pathname.startsWith("/watchlist") ? styles.activeDockItem : ""}`}
        >
          <Bookmark size={18} />
          <span>Library</span>
        </Link>
      </nav>
    </>
  );
}
