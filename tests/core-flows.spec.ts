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

    await expect(page).toHaveURL(/\/anime\/(anilist|kitsu|mal)-[\w-]+/, { timeout: 20000 });
    await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
  });

  test('Navigation Across Discovery & Utility Pages', async ({ page }) => {
    test.setTimeout(90000);
    const pagesToTest = [
      { text: 'Discover', url: '/discover', heading: 'Discover & Explore Anime' },
      { text: 'Seasonal', url: '/seasonal', heading: 'Anime' },
      { text: 'Calendar', url: '/calendar', heading: 'Release Calendar' },
      { text: 'Simulators', url: '/simulators', heading: 'Interactive 3D Simulators' },
      { text: 'Watchlist', url: '/watchlist', heading: 'My Watchlist' },
      { text: 'Favorites', url: '/favorites', heading: 'My Favorites' },
    ];

    for (const p of pagesToTest) {
      await page.goto('/');
      const navLink = page.locator('header nav[aria-label="Desktop Navigation"] a').filter({ hasText: p.text });
      await expect(navLink).toBeVisible();
      await navLink.click();
      
      await expect(page).toHaveURL(new RegExp(p.url), { timeout: 20000 });
      await expect(page.locator('h1')).toContainText(p.heading, { timeout: 20000 });
      const content = await page.content();
      expect(content).not.toContain('Not Found');
    }
  });

  test('Phase 2 User Hub Pages (Dashboard, Profile, Settings)', async ({ page }) => {
    // 1. Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 20000 });
    const dashContent = await page.content();
    expect(dashContent).not.toContain('This section is currently under construction');

    // 2. Profile
    await page.goto('/profile');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 20000 });
    const profContent = await page.content();
    expect(profContent).not.toContain('This section is currently under construction');

    // 3. Settings
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Preferences & Settings', { timeout: 20000 });
    await expect(page.getByText('Player & Streaming')).toBeVisible();
    await expect(page.getByText('Autoplay Next Episode')).toBeVisible();
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

  test('3D Sun Simulator Route & Interactive Controls HUD', async ({ page }) => {
    await page.goto('/simulators/sun');
    
    // Check HUD title and controls
    await expect(page.getByText('The Sun: Stellar Dynamics')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Fusion Rate')).toBeVisible();
    await expect(page.getByText('Magnetic Activity')).toBeVisible();

    // Check that WebGL canvas rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('3D Black Hole Simulator Route & Physics HUD', async ({ page }) => {
    await page.goto('/simulators/blackhole');
    
    await expect(page.getByText('Supermassive Black Hole')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Kerr Spin Parameter')).toBeVisible();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('Watching Experience with Multi-Server Player & Comments', async ({ page }) => {
    await page.goto('/watch/kitsu-7442/1');

    await expect(page.locator('h1')).toContainText('Episode 1', { timeout: 25000 });

    // Verify player container and server switcher
    const playerContainer = page.locator('div[class*="playerContainer"]');
    await expect(playerContainer).toBeVisible();

    await expect(page.getByText('Server 1 (HD Stream)')).toBeVisible();
    await expect(page.getByText('SUB (JPN)')).toBeVisible();

    // Verify Episode Discussion Comments section is present
    await expect(page.getByText('Episode Discussion')).toBeVisible();
  });

  test('Mobile Drawer Menu Test', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuToggle = page.locator('button[aria-label="Open menu"]');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    const mobileDrawer = page.locator('div[class*="mobileDrawer"]').first();
    await expect(mobileDrawer).toBeVisible();
    await expect(mobileDrawer.getByText('Discover Anime')).toBeVisible();
    await expect(mobileDrawer.getByText('Release Calendar')).toBeVisible();

    await mobileDrawer.getByText('Discover Anime').click();
    await expect(page).toHaveURL(/\/discover/);
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
