import { test, expect } from '@playwright/test';

test.describe('NextGen Anime Core Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('Homepage Data & Card Geometry Strictness', async ({ page }) => {
    await page.goto('/');

    // Verify Trending Section exists
    const trendingSection = page.locator('section').filter({ hasText: 'Trending Now' });
    await expect(trendingSection).toBeVisible();

    // Get all cards in the trending section
    const cards = trendingSection.locator('a[href^="/anime/"]');
    
    // Wait for at least 3 cards to be visible
    await expect(cards.nth(0)).toBeVisible({ timeout: 20000 });
    await expect(cards.nth(1)).toBeVisible({ timeout: 20000 });
    await expect(cards.nth(2)).toBeVisible({ timeout: 20000 });

    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify no fake anime text anywhere
    const bodyText = await page.content();
    expect(bodyText).not.toContain('Example Anime');
    expect(bodyText).not.toContain('Test Anime');

    // Mathematically assert that cards have uniform dimensions
    const box1 = await cards.nth(0).boundingBox();
    const box2 = await cards.nth(1).boundingBox();
    const box3 = await cards.nth(2).boundingBox();

    expect(box1?.width).toBeDefined();
    expect(box2?.width).toBeDefined();
    expect(box3?.width).toBeDefined();
    
    expect(Math.abs(box1!.width - box2!.width)).toBeLessThan(3);
    expect(Math.abs(box1!.width - box3!.width)).toBeLessThan(3);
  });

  test('Search Flow Test with Real Kitsu Fallback', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/');

    const searchBtn = page.locator('header button[aria-label="Search (Ctrl+K)"]');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    
    const searchInput = page.getByPlaceholder('Search anime...');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('Naruto');

    const resultItem = page.locator('div[class*="resultsList"] a[class*="resultItem"]').first();
    await expect(resultItem).toBeVisible({ timeout: 20000 });

    await resultItem.click();
    await expect(page).toHaveURL(/\/anime\/(anilist|kitsu|mal)-[\w-]+/, { timeout: 30000 });

    await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
  });

  test('Navigation Across Discovery & Utility Pages', async ({ page }) => {
    test.setTimeout(120000);
    const pagesToTest = [
      { text: 'Discover', url: '/discover', heading: 'Discover & Explore Anime' },
      { text: 'Seasonal', url: '/seasonal', heading: 'Anime' },
      { text: 'Calendar', url: '/calendar', heading: 'Release Calendar' },
      { text: 'Watchlist', url: '/watchlist', heading: 'My Watchlist' },
      { text: 'Favorites', url: '/favorites', heading: 'My Favorites' },
    ];

    // 1. Verify all desktop navigation links exist in the header
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    for (const p of pagesToTest) {
      const navLink = page.locator(`header nav[aria-label="Desktop Navigation"] a[href="${p.url}"]`);
      await expect(navLink).toBeVisible({ timeout: 15000 });
    }

    // 2. Verify each discovery/utility route renders without 404 or errors
    for (const p of pagesToTest) {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toContainText(p.heading, { timeout: 30000 });
      const content = await page.content();
      expect(content).not.toContain('Not Found');
    }
  });

  test('Phase 2 User Hub Pages (Dashboard, Profile, Settings)', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 30000 });
    const dashContent = await page.content();
    expect(dashContent).not.toContain('This section is currently under construction');

    // 2. Profile
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 30000 });
    const profContent = await page.content();
    expect(profContent).not.toContain('This section is currently under construction');

    // 3. Settings
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Preferences & Settings', { timeout: 30000 });
    await expect(page.getByText('Player & Streaming')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Autoplay Next Episode')).toBeVisible({ timeout: 15000 });
  });

  test('Phase 2 Directory Pages (Characters, Staff, Studios)', async ({ page }) => {
    // Characters directory
    await page.goto('/characters');
    await expect(page.locator('h1')).toContainText('Anime Characters', { timeout: 25000 });
    const charCards = page.locator('a[href^="/character/"]');
    await expect(charCards.first()).toBeVisible({ timeout: 25000 });

    // Staff directory
    await page.goto('/staff');
    await expect(page.locator('h1')).toContainText('Anime Creators & Staff', { timeout: 25000 });
    const staffCards = page.locator('a[href^="/staff/"]');
    await expect(staffCards.first()).toBeVisible({ timeout: 25000 });

    // Studios directory
    await page.goto('/studios');
    await expect(page.locator('h1')).toContainText('Animation Studios', { timeout: 25000 });
    const studioCards = page.locator('a[href^="/studio/"]');
    await expect(studioCards.first()).toBeVisible({ timeout: 25000 });
  });

  test('Phase 2 Utilities (Compare Matrix & Random Anime)', async ({ page }) => {
    // Compare Matrix
    await page.goto('/compare');
    await expect(page.locator('h1')).toContainText('Anime Comparison Matrix', { timeout: 20000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Score / Rating')).toBeVisible();

    // Random Anime Roulette
    await page.goto('/random');
    await expect(page.locator('h1')).toContainText('Random Anime Roulette', { timeout: 20000 });
    const rollBtn = page.getByRole('button', { name: /Roll Again|Rolling/i });
    await expect(rollBtn).toBeVisible({ timeout: 20000 });
  });

  test('3D Simulators Hub & Interactive Lab Catalog', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/simulators', { waitUntil: 'domcontentloaded' });
    
    // Check page header and catalog
    await expect(page.getByText('Interactive 3D Simulators')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Supermassive Black Hole')).toBeVisible();

    // Verify /simulators/sun redirect works cleanly to /simulators/blackhole
    await page.goto('/simulators/sun', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*simulators\/blackhole/, { timeout: 30000 });
  });

  test('3D Black Hole Simulator Route & Physics HUD', async ({ page }) => {
    await page.goto('/simulators/blackhole');
    
    await expect(page.getByText('Supermassive Black Hole')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Kerr Spin Parameter')).toBeVisible();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('Watching Experience with Multi-Server Player & Comments', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/watch/kitsu-7442/1');

    await expect(page.locator('h1')).toContainText('Episode 1', { timeout: 25000 });

    // Verify player container and server switcher
    const playerContainer = page.locator('div[class*="playerContainer"]');
    await expect(playerContainer).toBeVisible();

    await expect(page.getByText(/Server|ReAnime/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#sub-btn')).toBeVisible({ timeout: 20000 });

    // Verify Episode Discussion Comments section is present
    await expect(page.getByText('Episode Discussion')).toBeVisible();
  });

  test('Mushoku Tensei Season 3 Episode Release Status and Watch Layout', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Verify API reports 12 released episodes and 2 upcoming episodes
    const apiRes = await page.request.get('/api/anime/episodes?animeId=anilist-178789');
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();
    expect(data.releasedEpisodes).toBe(12);
    expect(data.upcomingEpisodes).toBe(2);

    // 2. Navigate to Watch Page
    await page.goto('/watch/anilist-178789/1', { waitUntil: 'domcontentloaded' });
    
    // Check Download button is visible in player control bar
    const downloadBtn = page.locator('#download-btn');
    await expect(downloadBtn).toBeVisible({ timeout: 25000 });

    // Verify Episode Sidebar exists beside player
    const sidebar = page.locator('aside[class*="episodesSidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 25000 });

    // Verify Episode 1 is playable in the episode list (active/link)
    const ep1Link = sidebar.locator('div[class*="episodesSidebarList"] a[href="/watch/anilist-178789/1"]');
    await expect(ep1Link).toBeVisible();

    // Verify Episode 12 is playable link
    const ep12Link = sidebar.locator('div[class*="episodesSidebarList"] a[href="/watch/anilist-178789/12"]');
    await expect(ep12Link).toBeVisible();

    // Verify Episode 13 is locked/upcoming
    const ep13Locked = sidebar.locator('div[class*="epCardSmallLocked"]').filter({ hasText: 'EP 13' });
    await expect(ep13Locked).toBeVisible();
  });

  test('Episode Selection, Stream Resolution, and Season/Part Hierarchy', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Navigate directly to Episode 2
    await page.goto('/watch/anilist-178789/2', { waitUntil: 'domcontentloaded' });

    // Verify Title / Badge reflects Episode 2
    await expect(page.locator('h1')).toContainText('Episode 2', { timeout: 25000 });

    // Verify player is present and does NOT show "Streaming unavailable"
    const unavailableText = page.getByText('No verified stream source was found for this episode');
    await expect(unavailableText).not.toBeVisible({ timeout: 10000 });

    // Verify server list / player buttons are visible
    await expect(page.getByText(/Server|ReAnime/i).first()).toBeVisible({ timeout: 20000 });

    // Verify Season pills exist in the episode sidebar
    const seasonPills = page.locator('div[class*="seasonSelectPills"]');
    await expect(seasonPills).toBeVisible({ timeout: 15000 });

    // 2. Click Episode 7 in the sidebar to verify dynamic episode switching
    const sidebar = page.locator('aside[class*="episodesSidebar"]');
    const ep7Link = sidebar.locator('div[class*="episodesSidebarList"] a[href="/watch/anilist-178789/7"]');
    await expect(ep7Link).toBeVisible();
    await ep7Link.click();

    // Verify URL updated and Episode 7 loaded
    await expect(page).toHaveURL(/.*watch\/anilist-178789\/7/, { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('Episode 7', { timeout: 20000 });
    await expect(unavailableText).not.toBeVisible({ timeout: 10000 });
  });

  test('Mobile Drawer Menu Test', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuToggle = page.locator('button[aria-label="Open menu"]');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    const mobileDrawer = page.locator('aside[class*="mobileDrawer"], div[class*="mobileDrawer"]').first();
    await expect(mobileDrawer).toBeVisible();
    await expect(mobileDrawer.getByText('Discover Anime')).toBeVisible();
    await expect(mobileDrawer.getByText('Release Calendar')).toBeVisible();

    await mobileDrawer.getByText('Discover Anime').click();
    await expect(page).toHaveURL(/\/discover/, { timeout: 30000 });
  });
});

test.describe('Responsiveness Across All Device Viewports', () => {
  const viewports = [
    { width: 320, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 }
  ];

  for (const vp of viewports) {
    test(`renders correctly at ${vp.width}x${vp.height} without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      
      await expect(page.locator('section').filter({ hasText: 'Trending Now' })).toBeVisible({ timeout: 20000 });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);
      
      expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
    });
  }
});
