/**
 * Heba Hijab - Interactive Luxury UI Scripts & Robust Shopping Cart State
 */

// Global cart state variables (kept in sync via updateCartTotals)
let cartTotal = 0;
let cartItemsCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initFilterTabs();
    initWishlist();
    initCartDrawer();
    initToastDismiss();
    
    // Compute accurate totals from initial items on page load
    updateCartTotals();
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
                <a href="#products" class="btn btn-primary" style="padding: 9px 22px; font-size: 13px;" onclick="document.getElementById('cartCloseBtn').click()">تسوقي التشكيلة</a>
            `;
            cartItemsList.appendChild(msg);
        }
    } else if (emptyMsg) {
        emptyMsg.remove();
    }
}

/**
 * Dynamically extracts product details directly from the clicked card's DOM.
 * Ensures that whenever product prices or titles are updated in HTML,
 * the cart ALWAYS adds the exact current price with no hardcoded mismatches.
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

    addToCart(title, price, img);
}

/**
 * Adds an item to the shopping cart, updating state and quantities reactively.
 */
function addToCart(title, priceInput, imgUrl) {
    const cartItemsList = document.getElementById('cartItemsList');
    if (!cartItemsList) return;

    // Parse numeric price correctly
    const unitPrice = parsePrice(priceInput);

    // Remove empty message if present
    const emptyMsg = cartItemsList.querySelector('.cart-empty-message');
    if (emptyMsg) emptyMsg.remove();

    // Check if item already exists in cart by title
    const existingItems = cartItemsList.querySelectorAll('.cart-item');
    let foundItem = null;

    existingItems.forEach(item => {
        const titleEl = item.querySelector('.cart-item-title');
        if (titleEl && titleEl.textContent.trim() === title.trim()) {
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
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.setAttribute('data-price', unitPrice);
        itemEl.setAttribute('data-quantity', '1');

        itemEl.innerHTML = `
            <img src="${imgUrl}" alt="${title}" class="cart-item-img">
            <div class="cart-item-info">
                <h4 class="cart-item-title">${title}</h4>
                <div class="cart-item-meta">
                    <span class="cart-item-price">${formatPrice(unitPrice)}</span>
                    <div class="cart-qty-control">
                        <button type="button" class="qty-btn" onclick="updateItemQuantity(this, -1)" aria-label="تقليل الكمية">-</button>
                        <span class="qty-count">1</span>
                        <button type="button" class="qty-btn" onclick="updateItemQuantity(this, 1)" aria-label="زيادة الكمية">+</button>
                    </div>
                </div>
                <div class="cart-item-remove" onclick="removeCartItem(this)">حذف من السلة</div>
            </div>
        `;

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

    showToast(`تمت إضافة "${title}" إلى سلتكِ بنجاح ✨`);
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

function initFilterTabs() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            productCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(15px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 250);
                }
            });
        });
    });
}

/* ==========================================================================
   Wishlist & Drawer Open/Close
   ========================================================================== */

function initWishlist() {
    const wishlistBtns = document.querySelectorAll('.wishlist-btn');
    const headerWishlist = document.getElementById('wishlistHeaderBtn');

    wishlistBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.classList.toggle('active');
            if (btn.classList.contains('active')) {
                showToast('تمت إضافة المنتج إلى قائمة أمنياتكِ ❤️');
            } else {
                showToast('تمت إزالة المنتج من قائمة أمنياتكِ');
            }
        });
    });

    if (headerWishlist) {
        headerWishlist.addEventListener('click', () => {
            showToast('لديكِ قطع مميزة في قائمة أمنياتكِ ✨');
        });
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
