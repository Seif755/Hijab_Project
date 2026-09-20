/**
 * Heba Hijab - Interactive Luxury UI Scripts & Robust Shopping Cart State
 */

// Global cart state variables (kept in sync via updateCartTotals)
let cartTotal = 0;
let cartItemsCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initProductSwatches();
    initHeaderSearch();
    initFilterTabs();
    initWishlist();
    loadCartFromStorage();
    initCartDrawer();
    initToastDismiss();
    
    // Compute accurate totals from initial items on page load
    updateCartTotals();

    // Check if we are on the favorites page
    if (document.getElementById('favoritesContainer')) {
        renderFavoritesPage();
    }
});

/* ==========================================================================
   Price Parsing & Formatting Utilities (Supports Arabic & Western Numerals)
   ========================================================================== */

/**
 * Parses numeric price from any input format:
 * Handles Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩), Persian numerals, Western numerals,
 * and strings containing currency symbols (e.g. '٢٢٠ ج.م', '500 EGP', '140').
 */
function parsePrice(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;

    let s = val.toString();
    const easternArabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const persianArabic = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    for (let i = 0; i < 10; i++) {
        s = s.replaceAll(easternArabic[i], i.toString());
        s = s.replaceAll(persianArabic[i], i.toString());
    }

    // Retain only digits and decimal separator
    const cleaned = s.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Formats a numeric price into localized Egyptian Pound string
 */
function formatPrice(num) {
    return `${num} ج.م`;
}

/* ==========================================================================
   Centralized Cart State Management & Total Calculation
   ========================================================================== */

/**
 * Single Source of Truth for Cart Totals:
 * Reads every .cart-item in the cart drawer, computes item price * quantity,
 * updates the total amount, badge counters, and empty state.
 */
function updateCartTotals() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartCount = document.getElementById('cartCount');
    const drawerCount = document.getElementById('drawerCount');
    const cartSubtotalAmount = document.getElementById('cartSubtotalAmount');

    if (!cartItemsList) return;

    const items = cartItemsList.querySelectorAll('.cart-item');
    let runningTotal = 0;
    let runningCount = 0;

    items.forEach(item => {
        // 1. Resolve quantity
        const qtyAttr = item.getAttribute('data-quantity');
        const qtySpan = item.querySelector('.qty-count');
        const qty = parseInt(qtyAttr || (qtySpan ? qtySpan.textContent : '1'), 10) || 1;

        // 2. Resolve unit price accurately
        let unitPrice = parseFloat(item.getAttribute('data-price'));
        if (isNaN(unitPrice)) {
            const priceEl = item.querySelector('.cart-item-price');
            unitPrice = priceEl ? parsePrice(priceEl.textContent) : 0;
            item.setAttribute('data-price', unitPrice);
        }

        // 3. Compute running math
        runningTotal += unitPrice * qty;
        runningCount += qty;

        // Update item price display if quantity > 1
        const priceEl = item.querySelector('.cart-item-price');
        if (priceEl && qty > 1) {
            priceEl.innerHTML = `${formatPrice(unitPrice * qty)} <small style="font-size: 11px; opacity: 0.75; font-weight: 500;">(${formatPrice(unitPrice)} × ${qty})</small>`;
        } else if (priceEl) {
            priceEl.textContent = formatPrice(unitPrice);
        }
    });

    // Update global state
    cartTotal = runningTotal;
    cartItemsCount = runningCount;

    // Update UI elements
    if (cartCount) cartCount.textContent = runningCount;
    if (drawerCount) drawerCount.textContent = runningCount;
    if (cartSubtotalAmount) cartSubtotalAmount.textContent = formatPrice(runningTotal);

    // Save cart state to localStorage for persistence across pages
    saveCartToStorage();

    // Manage Empty State Display
    const emptyMsg = cartItemsList.querySelector('.cart-empty-message');
    if (items.length === 0) {
        if (!emptyMsg) {
            const msg = document.createElement('div');
            msg.className = 'cart-empty-message';
            msg.innerHTML = `
                <div style="font-size: 34px; margin-bottom: 8px;">🛍️</div>
                <p style="font-weight: 600; color: var(--text-color); margin-bottom: 4px;">سلة مشترياتكِ فارغة حالياً</p>
                <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">اكتشفي أحدث القطع وأضيفي ما يعجبكِ</p>
                <a href="index.html#products" class="btn btn-primary" style="padding: 9px 22px; font-size: 13px;" onclick="const cb = document.getElementById('cartCloseBtn'); if(cb) cb.click();">تسوقي التشكيلة</a>
            `;
            cartItemsList.appendChild(msg);
        }
    } else if (emptyMsg) {
        emptyMsg.remove();
    }
}

/**
 * Normalizes selectedColor into a standard { name, code } object
 */
function normalizeSelectedColor(color) {
    if (!color) return null;
    if (typeof color === 'string') {
        return { name: color.trim(), code: '' };
    }
    if (typeof color === 'object') {
        const name = (color.name || '').trim();
        const code = (color.code || color.hex || '').trim();
        if (name || code) {
            return { name: name || 'الافتراضي', code };
        }
    }
    return null;
}

/**
 * Creates a DOM element for a cart item including the visual selected color indicator
 */
function createCartItemElement(title, price, quantity, img, selectedColor) {
    const normColor = normalizeSelectedColor(selectedColor);
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.setAttribute('data-price', price);
    itemEl.setAttribute('data-quantity', quantity);
    if (normColor && normColor.name) itemEl.setAttribute('data-color-name', normColor.name);
    if (normColor && normColor.code) itemEl.setAttribute('data-color-code', normColor.code);

    const colorHtml = (normColor && normColor.name) ? `
        <div class="cart-item-color">
            ${normColor.code ? `<span class="item-color-dot" style="background-color: ${normColor.code};"></span>` : ''}
            <span class="item-color-label">اللون: <strong>${normColor.name}</strong></span>
        </div>
    ` : '';

    itemEl.innerHTML = `
        <img src="${img}" alt="${title}" class="cart-item-img" width="65" height="75" loading="lazy">
        <div class="cart-item-info">
            <h4 class="cart-item-title">${title}</h4>
            ${colorHtml}
            <div class="cart-item-meta">
                <span class="cart-item-price">${formatPrice(price)}</span>
                <div class="cart-qty-control">
                    <button type="button" class="qty-btn" onclick="updateItemQuantity(this, -1)" aria-label="تقليل الكمية">-</button>
                    <span class="qty-count">${quantity}</span>
                    <button type="button" class="qty-btn" onclick="updateItemQuantity(this, 1)" aria-label="زيادة الكمية">+</button>
                </div>
            </div>
            <div class="cart-item-remove" onclick="removeCartItem(this)">حذف من السلة</div>
        </div>
    `;
    return itemEl;
}

/**
 * Saves current shopping cart items to localStorage including selected color variant
 */
function saveCartToStorage() {
    const cartItemsList = document.getElementById('cartItemsList');
    if (!cartItemsList) return;
    const items = [];
    cartItemsList.querySelectorAll('.cart-item').forEach(item => {
        const titleEl = item.querySelector('.cart-item-title');
        const imgEl = item.querySelector('.cart-item-img');
        const price = parseFloat(item.getAttribute('data-price')) || 0;
        const quantity = parseInt(item.getAttribute('data-quantity') || '1', 10) || 1;
        const title = titleEl ? titleEl.textContent.trim() : '';
        const img = imgEl ? (imgEl.getAttribute('src') || imgEl.src) : '';

        const colorName = item.getAttribute('data-color-name') || '';
        const colorCode = item.getAttribute('data-color-code') || '';
        const selectedColor = (colorName || colorCode) ? { name: colorName, code: colorCode } : null;

        if (title) {
            items.push({ title, price, quantity, img, selectedColor });
        }
    });
    try {
        localStorage.setItem('heba_cart', JSON.stringify(items));
    } catch (e) {
        console.warn('LocalStorage save error:', e);
    }
}

/**
 * Loads cart items from localStorage on initial page load
 */
function loadCartFromStorage() {
    const cartItemsList = document.getElementById('cartItemsList');
    if (!cartItemsList) return;
    try {
        const stored = localStorage.getItem('heba_cart');
        if (stored !== null) {
            const items = JSON.parse(stored);
            cartItemsList.innerHTML = '';
            items.forEach(item => {
                const itemEl = createCartItemElement(item.title, item.price, item.quantity, item.img, item.selectedColor);
                cartItemsList.appendChild(itemEl);
            });
        }
    } catch (e) {
        console.warn('LocalStorage load error:', e);
    }
}

/**
 * Extracts currently active color swatch from product card.
 * Defaults to the first swatch if none is active.
 */
function getActiveColorFromCard(card) {
    if (!card) return { name: 'الافتراضي', code: '#b57a70' };
    let swatch = card.querySelector('.product-swatches .swatch.active');
    if (!swatch) {
        swatch = card.querySelector('.product-swatches .swatch');
        if (swatch) swatch.classList.add('active');
    }
    if (swatch) {
        const name = swatch.getAttribute('data-color-name') || swatch.getAttribute('title') || 'الافتراضي';
        const code = swatch.style.backgroundColor || swatch.getAttribute('data-color-code') || '#b57a70';
        return { name, code };
    }
    return { name: 'الافتراضي', code: '#b57a70' };
}

/**
 * Dynamically extracts product details directly from the clicked card's DOM.
 * Captures currently active color swatch and passes it to addToCart.
 */
function addProductFromCard(button) {
    const card = button.closest('.product-card');
    if (!card) return;

    const titleEl = card.querySelector('.product-title');
    const priceEl = card.querySelector('.price-current');
    const imgEl = card.querySelector('.product-thumb-wrapper img');

    const title = titleEl ? titleEl.textContent.trim() : 'قطعة حجاب فاخرة';
    const price = priceEl ? priceEl.textContent.trim() : '180';
    const img = imgEl ? imgEl.src : 'images/product_chiffon.jpg';
    const selectedColor = getActiveColorFromCard(card);

    addToCart(title, price, img, selectedColor);
}

/**
 * Adds an item to the shopping cart with selected color variant.
 * Uniqueness matches by both product title and color name.
 */
function addToCart(title, priceInput, imgUrl, selectedColor) {
    const cartItemsList = document.getElementById('cartItemsList');
    if (!cartItemsList) return;

    // Parse numeric price correctly
    const unitPrice = parsePrice(priceInput);
    const normColor = normalizeSelectedColor(selectedColor);

    // Remove empty message if present
    const emptyMsg = cartItemsList.querySelector('.cart-empty-message');
    if (emptyMsg) emptyMsg.remove();

    // Check if item already exists in cart by title AND selected color
    const existingItems = cartItemsList.querySelectorAll('.cart-item');
    let foundItem = null;

    existingItems.forEach(item => {
        const titleEl = item.querySelector('.cart-item-title');
        const existingColorName = item.getAttribute('data-color-name') || '';
        const targetColorName = (normColor && normColor.name) ? normColor.name : '';

        if (titleEl && titleEl.textContent.trim() === title.trim() && existingColorName === targetColorName) {
            foundItem = item;
        }
    });

    if (foundItem) {
        // Increment quantity of existing item
        const currentQty = parseInt(foundItem.getAttribute('data-quantity') || '1', 10);
        const newQty = currentQty + 1;
        foundItem.setAttribute('data-quantity', newQty);

        const qtyCountEl = foundItem.querySelector('.qty-count');
        if (qtyCountEl) qtyCountEl.textContent = newQty;
    } else {
        // Construct new cart item element
        const itemEl = createCartItemElement(title, unitPrice, 1, imgUrl, normColor);
        cartItemsList.appendChild(itemEl);
    }

    // Recalculate cart totals dynamically
    updateCartTotals();

    // Trigger bump animation on cart badge
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.classList.remove('bump');
        void cartCount.offsetWidth; // Trigger DOM reflow
        cartCount.classList.add('bump');
    }

    const toastText = (normColor && normColor.name)
        ? `تمت إضافة "${title} (${normColor.name})" إلى سلتكِ بنجاح ✨`
        : `تمت إضافة "${title}" إلى سلتكِ بنجاح ✨`;
    showToast(toastText);
}

/**
 * Updates item quantity (+1 or -1) and recalculates the cart total.
 */
function updateItemQuantity(button, delta) {
    const item = button.closest('.cart-item');
    if (!item) return;

    const currentQty = parseInt(item.getAttribute('data-quantity') || '1', 10);
    const newQty = currentQty + delta;

    if (newQty <= 0) {
        removeCartItem(button);
        return;
    }

    item.setAttribute('data-quantity', newQty);
    const qtySpan = item.querySelector('.qty-count');
    if (qtySpan) qtySpan.textContent = newQty;

    updateCartTotals();
}

/**
 * Removes an item from the cart with smooth animation and updates totals.
 */
function removeCartItem(button) {
    const item = button.closest('.cart-item');
    if (!item) return;

    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    item.style.transition = 'all 0.25s ease';

    setTimeout(() => {
        item.remove();
        updateCartTotals();
        showToast('تم حذف المنتج من سلتكِ');
    }, 250);
}

/* ==========================================================================
   Navigation & Category Filters
   ========================================================================== */

function initNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('mobile-open');
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('mobile-open');
            });
        });
    }

    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.style.boxShadow = '0 8px 24px rgba(74, 59, 57, 0.08)';
        } else {
            header.style.boxShadow = 'var(--shadow-soft)';
        }
    });
}

/* ==========================================================================
   Arabic Text Normalization & Dynamic Live Search
   ========================================================================== */

/**
 * Normalizes Arabic text for tolerant live search:
 * Handles Alef variants (أ، إ، آ، ٱ -> ا), Taa Marbuta (ة -> ه),
 * Yaa/Alif Maqsura (ى -> ي), strips Tashkeel/diacritics & tatweel,
 * and normalizes whitespace and lowercases Latin characters.
 */
function normalizeArabic(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        // Strip Arabic diacritics / Tashkeel & Tanween
        .replace(/[\u064B-\u065F\u0670]/g, '')
        // Strip Tatweel (kashida)
        .replace(/\u0640/g, '')
        // Normalize Alef forms to bare Alif
        .replace(/[أإآٱ]/g, 'ا')
        // Normalize Taa Marbuta to Haa
        .replace(/ة/g, 'ه')
        // Normalize Yaa / Alif Maqsura
        .replace(/[ىي]/g, 'ي')
        .trim();
}

/**
 * Helper to safely cancel any pending animation frame or timer on a card
 */
function cancelCardAnim(card) {
    if (card._animTimer) {
        cancelAnimationFrame(card._animTimer);
        clearTimeout(card._animTimer);
        card._animTimer = null;
    }
}

/**
 * Restores product card visibility according to the currently active category filter tab.
 */
function restoreCategoryFilter() {
    const productCards = document.querySelectorAll('.product-card');
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const filter = activeFilterBtn 
        ? (activeFilterBtn.getAttribute('data-category') || activeFilterBtn.getAttribute('data-filter') || 'all')
        : 'all';

    productCards.forEach(card => {
        cancelCardAnim(card);

        const category = card.getAttribute('data-category');
        const shouldShow = (filter === 'all' || category === filter);

        if (shouldShow) {
            if (card.style.display !== 'flex') {
                card.style.display = 'flex';
                card.style.opacity = '0';
                card.style.transform = 'translateY(6px)';
                card._animTimer = requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    card._animTimer = null;
                });
            } else {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }
        } else {
            card.style.display = 'none';
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
        }
    });
}

function initFilterTabs() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            // If an active search query is present, clear it when explicitly clicking a category
            const headerSearchInput = document.getElementById('headerSearchInput');
            const searchClearBtn = document.getElementById('searchClearBtn');
            const searchEmptyState = document.getElementById('searchEmptyState');
            const searchResultsSummary = document.getElementById('searchResultsSummary');
            const productGrid = document.getElementById('productGrid');

            if (headerSearchInput && headerSearchInput.value) {
                headerSearchInput.value = '';
                if (searchClearBtn) searchClearBtn.style.display = 'none';
                if (searchEmptyState) searchEmptyState.style.display = 'none';
                if (searchResultsSummary) searchResultsSummary.style.display = 'none';
                if (productGrid) productGrid.style.display = '';
            }

            restoreCategoryFilter();
        });
    });
}

function initHeaderSearch() {
    const searchOpenBtn = document.getElementById('searchOpenBtn');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const headerSearchOverlay = document.getElementById('headerSearchOverlay');
    const headerSearchInput = document.getElementById('headerSearchInput');
    const searchEmptyState = document.getElementById('searchEmptyState');
    const searchResetBtn = document.getElementById('searchResetBtn');
    const searchQueryEcho = document.getElementById('searchQueryEcho');
    const searchResultsSummary = document.getElementById('searchResultsSummary');
    const searchSummaryQuery = document.getElementById('searchSummaryQuery');
    const searchSummaryCount = document.getElementById('searchSummaryCount');
    const searchSummaryResetBtn = document.getElementById('searchSummaryResetBtn');
    const productGrid = document.getElementById('productGrid');

    if (!searchOpenBtn || !headerSearchOverlay || !headerSearchInput) return;

    let isSearchOpen = false;
    let searchSessionVersion = 0;
    let hasNavigatedInCurrentSession = false;
    let navigationDebounceTimer = null;

    function cancelPendingNavigation() {
        if (navigationDebounceTimer) {
            clearTimeout(navigationDebounceTimer);
            navigationDebounceTimer = null;
        }
    }

    function formatProductCount(count) {
        if (count === 0) return 'لا توجد منتجات';
        if (count === 1) return 'منتج واحد';
        if (count === 2) return 'منتجان';
        if (count >= 3 && count <= 10) return `${count} منتجات`;
        return `${count} منتج`;
    }

    function openSearch() {
        if (isSearchOpen) return;
        isSearchOpen = true;
        hasNavigatedInCurrentSession = false;
        cancelPendingNavigation();
        headerSearchOverlay.classList.add('active');
        headerSearchOverlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            headerSearchInput.focus();
        }, 50);
    }

    function closeSearch(clearQuery = true) {
        if (!isSearchOpen) return;
        isSearchOpen = false;
        cancelPendingNavigation();
        headerSearchOverlay.classList.remove('active');
        headerSearchOverlay.setAttribute('aria-hidden', 'true');
        if (clearQuery) {
            hasNavigatedInCurrentSession = false;
            headerSearchInput.value = '';
            if (searchClearBtn) searchClearBtn.style.display = 'none';
            applyLiveSearch('');
        }
        headerSearchInput.blur();
    }

    function getResultScrollTarget() {
        // 1. If empty state is active (0 matches)
        if (searchEmptyState && searchEmptyState.style.display !== 'none') {
            return (searchResultsSummary && searchResultsSummary.style.display !== 'none')
                ? searchResultsSummary
                : searchEmptyState;
        }
        // 2. If search results summary is displayed above product grid
        if (searchResultsSummary && searchResultsSummary.style.display !== 'none') {
            return searchResultsSummary;
        }
        // 3. Primary product grid element
        if (productGrid && productGrid.style.display !== 'none') {
            return productGrid;
        }
        // 4. Favorites page container
        const favContainer = document.getElementById('favoritesContainer');
        if (favContainer) return favContainer;

        // 5. Fallback section
        return document.getElementById('products') || document.querySelector('.favorites-section');
    }

    function isResultTargetVisible(target) {
        if (!target) return true;

        const rect = target.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const header = document.querySelector('header.site-header');
        const headerHeight = header ? header.offsetHeight : 85;

        // Target is visible if top is within viewport bounds and bottom is below sticky header
        return rect.top <= (windowHeight * 0.75) && rect.bottom >= (headerHeight + 40);
    }

    function navigateToResults(forceScroll = false) {
        cancelPendingNavigation();

        if (hasNavigatedInCurrentSession && !forceScroll) return;

        const target = getResultScrollTarget();
        if (!target) return;

        if (!forceScroll && isResultTargetVisible(target)) {
            hasNavigatedInCurrentSession = true;
            return;
        }

        hasNavigatedInCurrentSession = true;

        const header = document.querySelector('header.site-header');
        const headerHeight = header ? header.offsetHeight : 85;
        const rect = target.getBoundingClientRect();
        const targetY = window.pageYOffset + rect.top - headerHeight - 16;

        window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
        });
    }

    function scheduleResultNavigation() {
        cancelPendingNavigation();

        // If we have already navigated in this search session, do not scroll again
        if (hasNavigatedInCurrentSession) return;

        const target = getResultScrollTarget();
        if (!target) return;

        // Smart Debounce: Wait 1200ms (1.2s) after the user completely finishes/pauses typing
        navigationDebounceTimer = setTimeout(() => {
            // Force mobile virtual keyboard to close gracefully
            const searchInput = document.getElementById('headerSearchInput');
            if (searchInput) {
                searchInput.blur();
            }

            // Auto-close search overlay while preserving live-filtered results
            closeSearch(false);

            // Smoothly scroll down to the filtered results
            navigateToResults(true);
        }, 1200);
    }

    function applyLiveSearch(rawQuery) {
        const currentVersion = ++searchSessionVersion;
        const query = (rawQuery || '').trim();
        const productCards = document.querySelectorAll('.product-card');
        const favCards = document.querySelectorAll('.fav-card');
        const filterTabs = document.querySelector('.filter-tabs');

        // Update clear button visibility ("مسح" text button)
        if (searchClearBtn) {
            searchClearBtn.style.display = query.length > 0 ? 'inline-flex' : 'none';
        }

        // 1. If on index.html with product cards
        if (productCards.length > 0) {
            if (!query) {
                // Empty query: reset navigation flag, restore normal state and active category filter tab
                hasNavigatedInCurrentSession = false;
                cancelPendingNavigation();
                if (searchResultsSummary) searchResultsSummary.style.display = 'none';
                if (filterTabs) filterTabs.style.display = '';
                if (searchEmptyState) searchEmptyState.style.display = 'none';
                if (productGrid) productGrid.style.display = '';
                restoreCategoryFilter();
                return;
            }

            // Active search query: hide category filter tabs to prevent confusion
            if (filterTabs) filterTabs.style.display = 'none';

            const normalizedQuery = normalizeArabic(query);
            const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
            let matchesCount = 0;

            // Known color keywords used across store collections (Arabic & English)
            const STORE_COLOR_KEYWORDS = [
                'أوف وايت',
                'offwhite',
                'بورجوندي',
                'burgundy',
                'شامبين',
                'champagne',
                'رمادي',
                'gray',
                'grey',
                'كشمير',
                'cashmere',
                'كحلي',
                'navy',
                'أزرق',
                'blue',
                'أسود',
                'black',
                'أبيض',
                'white',
                'برجاندي',
                'burgundy',
                'بورجوندي',
                'نبيتي',
                'مارون',
                'maroon',
                'وردي',
                'بينك',
                'pink',
                'زهري',
                'كريمي',
                'بيج',
                'beige',
                'بني',
                'brown',
                'نود',
                'nude',
                'روز',
                'rose'
            ];

            const COLOR_VARIANTS_MAP = {
                'أسود': ['أسود', 'اسود', 'black'],
                'black': ['أسود', 'اسود', 'black'],
                'أبيض': ['أبيض', 'ابيض', 'white'],
                'white': ['أبيض', 'ابيض', 'white'],
                'برجاندي': ['برجاندي', 'burgundy', 'بورجوندي', 'نبيتي', 'نبيتى', 'مارون', 'maroon'],
                'burgundy': ['burgundy', 'برجاندي', 'بورجوندي', 'نبيتي', 'نبيتى', 'maroon', 'مارون'],
                'بورجوندي': ['بورجوندي', 'برجاندي', 'burgundy', 'نبيتي', 'نبيتى', 'مارون', 'maroon'],
                'نبيتي': ['نبيتي', 'نبيتى', 'برجاندي', 'burgundy', 'بورجوندي', 'مارون', 'maroon'],
                'مارون': ['مارون', 'برجاندي', 'burgundy', 'بورجوندي', 'نبيتي', 'نبيتى', 'maroon'],
                'maroon': ['maroon', 'برجاندي', 'burgundy', 'بورجوندي', 'مارون', 'نبيتي', 'نبيتى'],
                'بينك': ['بينك', 'pink', 'وردي', 'وردى', 'زهري'],
                'pink': ['pink', 'بينك', 'وردي', 'وردى', 'زهري'],
                'زهري': ['زهري', 'زهرى', 'بينك', 'pink', 'وردي', 'وردى'],
                'أزرق': ['أزرق', 'ازرق', 'كحلي', 'blue'],
                'blue': ['أزرق', 'ازرق', 'كحلي', 'blue'],
                'كحلي': ['كحلي', 'أزرق', 'ازرق', 'navy', 'blue'],
                'navy': ['كحلي', 'أزرق', 'ازرق', 'navy', 'blue'],
                'كشمير': ['كشمير', 'كشميري', 'cashmere'],
                'cashmere': ['كشمير', 'كشميري', 'cashmere'],
                'بيج': ['بيج', 'بيجي', 'beige'],
                'beige': ['بيج', 'بيجي', 'beige'],
                'بني': ['بني', 'brown'],
                'brown': ['بني', 'brown'],
                'نود': ['نود', 'nude'],
                'nude': ['نود', 'nude'],
                'روز': ['روز', 'rose'],
                'rose': ['روز', 'rose'],
                'رمادي': ['رمادي', 'رمادى', 'gray', 'grey'],
                'gray': ['رمادي', 'رمادى', 'gray', 'grey'],
                'grey': ['رمادي', 'رمادى', 'gray', 'grey'],
                'وردي': ['وردي', 'وردى', 'pink', 'بينك'],
                'شامبين': ['شامبين', 'champagne'],
                'champagne': ['شامبين', 'champagne'],
                'أوف وايت': ['أوف وايت', 'اوف وايت', 'offwhite'],
                'offwhite': ['أوف وايت', 'اوف وايت', 'offwhite'],
                'كريمي': ['كريمي', 'أوف وايت', 'اوف وايت']
            };

            // Detect if the user's query contains any known color keyword
            let detectedColorVariants = [];
            for (const color of STORE_COLOR_KEYWORDS) {
                const normColor = normalizeArabic(color);
                if (queryTokens.some(token => token === normColor || token.includes(normColor)) || normalizedQuery.includes(normColor)) {
                    const rawVariants = COLOR_VARIANTS_MAP[color] || [color];
                    detectedColorVariants = rawVariants.map(v => normalizeArabic(v));
                    break;
                }
            }

            productCards.forEach(card => {
                cancelCardAnim(card);

                const title = card.querySelector('.product-title')?.textContent || '';
                const category = (card.getAttribute('data-category') || '') + ' ' + (card.querySelector('.product-category')?.textContent || '');
                const badge = card.querySelector('.product-badge')?.textContent || '';
                const desc = (card.getAttribute('data-description') || '') + ' ' + (card.querySelector('img')?.getAttribute('alt') || '');
                const colors = Array.from(card.querySelectorAll('.swatch')).map(s => {
                    return (s.getAttribute('data-color-name') || '') + ' ' + (s.getAttribute('title') || '');
                }).join(' ');

                const targetText = `${title} ${category} ${badge} ${desc} ${colors}`;
                const normalizedTarget = normalizeArabic(targetText);

                const isMatch = queryTokens.every(token => normalizedTarget.includes(token));

                if (isMatch) {
                    matchesCount++;

                    // Smart Auto-Color Selection: Auto-select swatch matching the detected color keyword
                    if (detectedColorVariants.length > 0) {
                        const swatches = card.querySelectorAll('.swatch');
                        let targetSwatch = null;

                        for (const swatch of swatches) {
                            const colorName = swatch.getAttribute('data-color-name') || '';
                            const title = swatch.getAttribute('title') || '';
                            const ariaLabel = swatch.getAttribute('aria-label') || '';
                            const imgSrc = swatch.getAttribute('data-img') || '';
                            const normSwatchInfo = normalizeArabic(`${colorName} ${title} ${ariaLabel} ${imgSrc}`);

                            if (detectedColorVariants.some(variant => normSwatchInfo.includes(variant))) {
                                targetSwatch = swatch;
                                break;
                            }
                        }

                        if (targetSwatch && !targetSwatch.classList.contains('active')) {
                            targetSwatch.click();
                        }
                    }

                    // If card is already displayed, keep it stable without re-animating/flickering
                    if (card.style.display === 'flex' && card.style.opacity === '1') {
                        card.style.transform = 'translateY(0)';
                    } else {
                        card.style.display = 'flex';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(6px)';
                        card._animTimer = requestAnimationFrame(() => {
                            if (currentVersion !== searchSessionVersion) return;
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                            card._animTimer = null;
                        });
                    }
                } else {
                    // Immediate synchronous hide: prevents stale timer races and layout thrashing
                    card.style.display = 'none';
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                }
            });

            // Always update search-results summary so user has a stable anchor
            if (searchResultsSummary) {
                if (searchSummaryQuery) searchSummaryQuery.textContent = query;
                if (searchSummaryCount) searchSummaryCount.textContent = formatProductCount(matchesCount);
                searchResultsSummary.style.display = 'flex';
            }

            // Toggle empty state vs product grid
            if (matchesCount === 0) {
                if (searchQueryEcho) searchQueryEcho.textContent = query;
                if (productGrid) productGrid.style.display = 'none';
                if (searchEmptyState) searchEmptyState.style.display = 'flex';
            } else {
                if (productGrid) productGrid.style.display = '';
                if (searchEmptyState) searchEmptyState.style.display = 'none';
            }
        }

        // 2. If on favorites page with fav-card items
        if (favCards.length > 0) {
            if (!query) {
                hasNavigatedInCurrentSession = false;
                cancelPendingNavigation();
                favCards.forEach(card => {
                    cancelCardAnim(card);
                    card.style.display = 'flex';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
                return;
            }

            const normalizedQuery = normalizeArabic(query);
            const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
            let favMatchesCount = 0;

            favCards.forEach(card => {
                cancelCardAnim(card);

                const title = card.querySelector('.fav-card-title')?.textContent || '';
                const category = card.querySelector('.fav-card-category')?.textContent || '';
                const badge = card.querySelector('.fav-card-badge')?.textContent || '';
                const color = card.querySelector('.item-color-label')?.textContent || '';
                const alt = card.querySelector('img')?.getAttribute('alt') || '';

                const targetText = `${title} ${category} ${badge} ${color} ${alt}`;
                const normalizedTarget = normalizeArabic(targetText);

                const isMatch = queryTokens.every(token => normalizedTarget.includes(token));

                if (isMatch) {
                    favMatchesCount++;
                    if (card.style.display === 'flex' && card.style.opacity === '1') {
                        card.style.transform = 'translateY(0)';
                    } else {
                        card.style.display = 'flex';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(6px)';
                        card._animTimer = requestAnimationFrame(() => {
                            if (currentVersion !== searchSessionVersion) return;
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                            card._animTimer = null;
                        });
                    }
                } else {
                    card.style.display = 'none';
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                }
            });
        }
    }

    // Event Listeners
    searchOpenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSearch();
    });

    // Close button: Exactly ONE visible X close control whose primary purpose is closing the search overlay
    if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeSearch(true);
        });
    }

    // Clear button ("مسح" text action): clears text and refocused input
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cancelPendingNavigation();
            hasNavigatedInCurrentSession = false;
            headerSearchInput.value = '';
            applyLiveSearch('');
            headerSearchInput.focus();
        });
    }

    // Reset button inside the empty state
    if (searchResetBtn) {
        searchResetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cancelPendingNavigation();
            hasNavigatedInCurrentSession = false;
            headerSearchInput.value = '';
            applyLiveSearch('');
            if (isSearchOpen) {
                closeSearch(true);
            }
        });
    }

    // Reset button inside search-results summary banner
    if (searchSummaryResetBtn) {
        searchSummaryResetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cancelPendingNavigation();
            hasNavigatedInCurrentSession = false;
            headerSearchInput.value = '';
            applyLiveSearch('');
            if (isSearchOpen) {
                closeSearch(true);
            }
        });
    }

    // Debounced result navigation: filtering is instantaneous, but viewport navigation only fires after typing pauses
    headerSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        applyLiveSearch(val);
        if (val.trim().length > 0) {
            scheduleResultNavigation();
        } else {
            cancelPendingNavigation();
            hasNavigatedInCurrentSession = false;
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSearchOpen) {
            closeSearch(true);
        }
    });

    // Close when clicking outside header (preserves active search so user can interact with results)
    document.addEventListener('click', (e) => {
        if (!isSearchOpen) return;
        const header = document.querySelector('header.site-header');
        if (header && !header.contains(e.target) && !searchOpenBtn.contains(e.target)) {
            closeSearch(false);
        }
    });

    // Handle Enter key: preserves live results, reveals results section, closes search overlay
    headerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            cancelPendingNavigation();
            const productCards = document.querySelectorAll('.product-card');
            const favCards = document.querySelectorAll('.fav-card');
            const query = headerSearchInput.value.trim();

            if (!productCards.length && !favCards.length && !document.getElementById('favoritesContainer') && query) {
                window.location.href = `index.html?search=${encodeURIComponent(query)}#products`;
                return;
            }

            // Close search overlay while keeping live-filtered results
            closeSearch(false);

            // Ensure the results section is visible in the user's view
            navigateToResults(true);
        }
    });

    // Check for search query in URL parameters (e.g. index.html?search=...)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
            openSearch();
            headerSearchInput.value = searchParam;
            applyLiveSearch(searchParam);
            setTimeout(() => {
                navigateToResults(true);
            }, 150);
        }
    } catch (e) {}
}

/* ==========================================================================
   Product Color Swatches & Dynamic Image Switching
   ========================================================================== */

function initProductSwatches() {
    const swatches = document.querySelectorAll('.product-card .swatch');
    if (!swatches.length) return;

    // Preload variant images so color switching is instantaneous
    swatches.forEach(swatch => {
        const imgSrc = swatch.getAttribute('data-img');
        if (imgSrc && !imgSrc.includes('placeholder')) {
            const preload = new Image();
            preload.src = imgSrc;
        }
    });

    swatches.forEach(swatch => {
        const handleSelect = (e) => {
            e.stopPropagation();
            const card = swatch.closest('.product-card');
            if (!card) return;

            const img = card.querySelector('.product-thumb-wrapper img');
            const newSrc = swatch.getAttribute('data-img');
            if (!newSrc || !img) return;

            // Update active state among swatches in the same card
            card.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');

            // Synchronize wishlist button state for this specific card & selected color
            syncWishlistButtons();

            const currentSrc = img.getAttribute('src');
            if (currentSrc === newSrc) return;

            // Smooth crossfade transition
            img.classList.add('switching');
            setTimeout(() => {
                img.setAttribute('src', newSrc);
                img.src = newSrc;
                img.onload = () => {
                    requestAnimationFrame(() => {
                        img.classList.remove('switching');
                    });
                };
                // Fallback in case onload is instant or doesn't fire for cached asset
                setTimeout(() => {
                    img.classList.remove('switching');
                }, 180);
            }, 100);
        };

        swatch.addEventListener('click', handleSelect);
        swatch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(e);
            }
        });
    });
}

/* ==========================================================================
   Wishlist & Favorites Central Management
   ========================================================================== */

function getWishlist() {
    try {
        const stored = localStorage.getItem('heba_wishlist');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading wishlist from storage', e);
        return [];
    }
}

function saveWishlist(items) {
    try {
        localStorage.setItem('heba_wishlist', JSON.stringify(items));
    } catch (e) {
        console.error('Error saving wishlist to storage', e);
    }
    updateWishlistBadge();
}

function updateWishlistBadge() {
    const count = getWishlist().length;
    const badge = document.getElementById('wishlistCount');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');
    }
}

/**
 * Generates a clean, consistent unique identifier for a product variant.
 * Format: productId + '__' + encodeURIComponent(colorName)
 */
function getVariantUniqueId(baseId, title, colorName) {
    const cleanBase = (baseId || (title ? title.trim().replace(/\s+/g, '-').toLowerCase() : 'product'));
    const cleanColor = colorName ? encodeURIComponent(colorName.trim()) : '';
    return cleanColor ? `${cleanBase}__${cleanColor}` : cleanBase;
}

/**
 * Checks if a stored wishlist item matches a given base product and color variant.
 */
function isItemMatchingVariant(item, baseId, title, colorName) {
    if (!item) return false;
    const targetColor = (colorName || '').trim();
    const itemColor = (item.selectedColor?.name || '').trim();

    // Check strict variant ID matches (both new format __ and previous - format)
    const targetIdNew = getVariantUniqueId(baseId, title, targetColor);
    const targetIdOld = `${baseId}-${encodeURIComponent(targetColor)}`;
    if (item.id === targetIdNew || item.id === targetIdOld) {
        return true;
    }

    // Match by product identity (baseId or title) AND exact color name
    const itemBaseId = item.baseId || (item.id ? item.id.split('__')[0].split('-')[0] : '');
    const matchesProduct = (baseId && itemBaseId === baseId) || (title && item.title === title);
    if (matchesProduct) {
        if (targetColor) {
            return itemColor === targetColor;
        }
        return !itemColor;
    }

    return false;
}

function extractProductDataFromCard(card) {
    if (!card) return null;
    const titleEl = card.querySelector('.product-title');
    const priceEl = card.querySelector('.price-current');
    const oldPriceEl = card.querySelector('.price-old');
    const imgEl = card.querySelector('.product-thumb-wrapper img') || card.querySelector('img');
    const categoryEl = card.querySelector('.product-category');
    const badgeEl = card.querySelector('.product-badge');

    const title = titleEl ? titleEl.textContent.trim() : 'قطعة حجاب فاخرة';
    const baseId = card.getAttribute('data-id') || title.replace(/\s+/g, '-').toLowerCase();
    const price = priceEl ? priceEl.textContent.trim() : '٢٢٠ ج.م';
    const oldPrice = oldPriceEl ? oldPriceEl.textContent.trim() : '';
    const img = imgEl ? (imgEl.getAttribute('src') || imgEl.src) : 'images/product_chiffon.jpg';
    const category = categoryEl ? categoryEl.textContent.trim() : 'أزياء محتشمة';
    const badge = badgeEl ? badgeEl.textContent.trim() : '';

    const selectedColor = getActiveColorFromCard(card);
    const colorName = selectedColor && selectedColor.name ? selectedColor.name.trim() : '';
    const id = getVariantUniqueId(baseId, title, colorName);

    return { id, baseId, title, price, oldPrice, img, category, badge, selectedColor };
}

function toggleWishlistProduct(productData, btnElement) {
    if (!productData) return;
    let list = getWishlist();
    const targetColorName = productData.selectedColor?.name?.trim() || '';
    const targetBaseId = productData.baseId;
    const targetTitle = productData.title;

    const index = list.findIndex(item => isItemMatchingVariant(item, targetBaseId, targetTitle, targetColorName));

    const colorText = targetColorName ? ` (${targetColorName})` : '';

    if (index > -1) {
        // Remove from wishlist
        list.splice(index, 1);
        saveWishlist(list);
        if (btnElement) btnElement.classList.remove('active');
        showToast(`تمت إزالة "${productData.title}${colorText}" من المفضلة`);
    } else {
        // Add to wishlist without deleting previous items
        list.push(productData);
        saveWishlist(list);
        if (btnElement) btnElement.classList.add('active');
        showToast(`تمت إضافة "${productData.title}${colorText}" إلى المفضلة ❤️`);
    }

    syncWishlistButtons();
}

function syncWishlistButtons() {
    const list = getWishlist();

    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const btn = card.querySelector('.wishlist-btn');
        if (!btn) return;
        const titleEl = card.querySelector('.product-title');
        const baseId = card.getAttribute('data-id');
        const title = titleEl ? titleEl.textContent.trim() : '';

        const activeColor = getActiveColorFromCard(card);
        const activeColorName = activeColor?.name ? activeColor.name.trim() : '';

        // Check strictly whether THIS specific newly selected color is favorited
        const isFavorited = list.some(item => isItemMatchingVariant(item, baseId, title, activeColorName));

        if (isFavorited) {
            btn.classList.add('active');
            btn.setAttribute('aria-label', `إزالة ${title} (${activeColorName}) من المفضلة`);
            btn.setAttribute('title', `إزالة من المفضلة (${activeColorName})`);
        } else {
            // Reset heart icon to inactive state
            btn.classList.remove('active');
            btn.setAttribute('aria-label', `إضافة ${title} (${activeColorName}) إلى المفضلة`);
            btn.setAttribute('title', `إضافة إلى المفضلة (${activeColorName})`);
        }
    });

    updateWishlistBadge();
}

function initWishlist() {
    const wishlistBtns = document.querySelectorAll('.wishlist-btn');

    wishlistBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.product-card');
            const data = extractProductDataFromCard(card);
            toggleWishlistProduct(data, btn);
        });
    });

    syncWishlistButtons();
    updateWishlistBadge();
}

function renderFavoritesPage() {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;

    const list = getWishlist();

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-wishlist-box">
                <div class="empty-wishlist-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>
                <h2 class="empty-wishlist-title">قائمة أمنياتكِ فارغة حالياً</h2>
                <p class="empty-wishlist-desc">لم تقومي بحفظ أي قطعة بعد في قائمة أمنياتكِ. استكشفي مجموعتنا الفاخرة من أحدث الطرح والخمارات وأضيفي قطعكِ المفضلة بضغطة زر واحدة!</p>
                <a href="index.html#products" class="btn btn-primary">
                    <span>استكشفي التشكيلات وتسوقي الآن</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </a>
            </div>
        `;
        return;
    }

    let cardsHtml = '';
    list.forEach(item => {
        const normColor = normalizeSelectedColor(item.selectedColor);
        const colorHtml = (normColor && normColor.name) ? `
            <div class="fav-card-color">
                ${normColor.code ? `<span class="item-color-dot" style="background-color: ${normColor.code};"></span>` : ''}
                <span class="item-color-label">اللون: <strong>${normColor.name}</strong></span>
            </div>
        ` : '';

        cardsHtml += `
            <article class="fav-card" data-id="${item.id}">
                <div class="fav-card-thumb-wrap">
                    ${item.badge ? `<span class="fav-card-badge">${item.badge}</span>` : ''}
                    <img src="${item.img}" alt="${item.title}" loading="lazy" width="400" height="500">
                </div>
                <div class="fav-card-body">
                    ${item.category ? `<span class="fav-card-category">${item.category}</span>` : ''}
                    <h3 class="fav-card-title">${item.title}</h3>
                    ${colorHtml}
                    <div class="fav-card-price-box">
                        <span class="fav-card-price-current">${item.price}</span>
                        ${item.oldPrice ? `<span class="fav-card-price-old">${item.oldPrice}</span>` : ''}
                    </div>
                    <div class="fav-card-actions">
                        <button type="button" class="btn-fav-add-cart" onclick="addFavoriteItemToCart('${item.id}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            <span>أضيفي إلى السلة</span>
                        </button>
                        <button type="button" class="btn-fav-remove" onclick="removeFromFavoritesPage('${item.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>إزالة من المفضلة</span>
                        </button>
                    </div>
                </div>
            </article>
        `;
    });

    container.innerHTML = `
        <div class="favorites-grid" id="favoritesGrid">
            ${cardsHtml}
        </div>
    `;
}

function removeFromFavoritesPage(id) {
    let list = getWishlist();
    const index = list.findIndex(item => item.id === id);
    let itemToRemove = null;
    if (index > -1) {
        itemToRemove = list[index];
        list.splice(index, 1);
    } else {
        const fallbackIndex = list.findIndex(item => item.title === id || decodeURIComponent(item.id || '') === id);
        if (fallbackIndex > -1) {
            itemToRemove = list[fallbackIndex];
            list.splice(fallbackIndex, 1);
        }
    }
    saveWishlist(list);

    const card = document.querySelector(`.fav-card[data-id="${id}"]`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9) translateY(20px)';
        card.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            card.remove();
            const grid = document.getElementById('favoritesGrid');
            if (grid && grid.children.length === 0) {
                renderFavoritesPage();
            }
        }, 300);
    } else {
        renderFavoritesPage();
    }

    const colorText = itemToRemove?.selectedColor?.name ? ` (${itemToRemove.selectedColor.name})` : '';
    showToast(itemToRemove ? `تمت إزالة "${itemToRemove.title}${colorText}" من المفضلة` : 'تمت إزالة المنتج من المفضلة');
}

function addFavoriteItemToCart(id) {
    const list = getWishlist();
    const item = list.find(prod => prod.id === id) || list.find(prod => prod.title === id || decodeURIComponent(prod.id || '') === id);
    if (!item) return;

    addToCart(item.title, item.price, item.img, item.selectedColor);

    // Open the cart drawer
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartDrawer && cartOverlay) {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}


function initCartDrawer() {
    const cartOpenBtn = document.getElementById('cartOpenBtn');
    const cartCloseBtn = document.getElementById('cartCloseBtn');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartDrawer = document.getElementById('cartDrawer');

    function openCart() {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (cartOpenBtn) cartOpenBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
}

/* ==========================================================================
   Toast Notice System
   ========================================================================== */

let toastTimeout;

function initToastDismiss() {
    const toast = document.getElementById('toastNotice');
    if (toast) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            clearTimeout(toastTimeout);
        });
    }
}

function showToast(message) {
    const toast = document.getElementById('toastNotice');
    const toastMsg = document.getElementById('toastMsg');

    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

function handleSubscribe(e) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input && input.value) {
        showToast('شكراً لانضمامكِ! كود الخصم في طريقه لبريدكِ ✨');
        input.value = '';
    }
}

/* ==========================================================================
   Theme Management (Dark / Light Mode)
   ========================================================================== */

function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const html = document.documentElement;

    // Synchronize body class with html element if set early by FOUC script
    if (html.classList.contains('dark-theme')) {
        document.body.classList.add('dark-theme');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = html.classList.contains('dark-theme') || html.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';

            if (newTheme === 'dark') {
                html.classList.add('dark-theme');
                document.body.classList.add('dark-theme');
                html.setAttribute('data-theme', 'dark');
                try {
                    localStorage.setItem('heba_theme', 'dark');
                } catch (err) {
                    console.warn('LocalStorage not accessible:', err);
                }
                showToast('تم تفعيل الوضع الليلي 🌙');
            } else {
                html.classList.remove('dark-theme');
                document.body.classList.remove('dark-theme');
                html.setAttribute('data-theme', 'light');
                try {
                    localStorage.setItem('heba_theme', 'light');
                } catch (err) {
                    console.warn('LocalStorage not accessible:', err);
                }
                showToast('تم تفعيل الوضع النهاري ☀️');
            }
        });
    }

    // Listen to OS system color-scheme changes if user has no saved preference
    if (window.matchMedia) {
        try {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                let savedTheme = null;
                try {
                    savedTheme = localStorage.getItem('heba_theme');
                } catch (err) {}

                if (!savedTheme) {
                    if (e.matches) {
                        html.classList.add('dark-theme');
                        document.body.classList.add('dark-theme');
                        html.setAttribute('data-theme', 'dark');
                    } else {
                        html.classList.remove('dark-theme');
                        document.body.classList.remove('dark-theme');
                        html.setAttribute('data-theme', 'light');
                    }
                }
            });
        } catch (err) {
            console.warn('Media query listener error:', err);
        }
    }
}
