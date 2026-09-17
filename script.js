/**
 * Heba Hijab - Interactive Luxury UI Scripts
 */

let cartTotal = 445;
let cartItemsCount = 2;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilterTabs();
    initWishlist();
    initCartDrawer();
});

/* Mobile Menu & Scroll behavior */
function initNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('mobile-open');
        });

        // Close when clicking any nav link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('mobile-open');
            });
        });
    }

    // Header scroll background tint
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.style.boxShadow = '0 8px 24px rgba(74, 59, 57, 0.08)';
        } else {
            header.style.boxShadow = 'var(--shadow-soft)';
        }
    });
}

/* Category Filter Tabs */
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

/* Wishlist Heart Toggle */
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

/* Cart Drawer Logic */
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

/* Add Item to Cart Function */
function addToCart(title, priceStr, imgUrl) {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartCount = document.getElementById('cartCount');
    const drawerCount = document.getElementById('drawerCount');
    const cartSubtotalAmount = document.getElementById('cartSubtotalAmount');

    // Parse numeric price from Arabic string
    const priceNum = parseInt(priceStr.replace(/[^\d]/g, '')) || 180;
    cartTotal += priceNum;
    cartItemsCount += 1;

    // Create new item element
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
        <img src="${imgUrl}" alt="${title}" class="cart-item-img">
        <div class="cart-item-info">
            <h4 class="cart-item-title">${title}</h4>
            <span class="cart-item-price">${priceStr}</span>
            <div class="cart-item-remove" onclick="removeCartItem(this, ${priceNum})">حذف من السلة</div>
        </div>
    `;

    cartItemsList.appendChild(itemEl);

    // Update counts & totals
    cartCount.textContent = cartItemsCount;
    drawerCount.textContent = cartItemsCount;
    cartSubtotalAmount.textContent = `${cartTotal} ج.م`;

    // Bump animation on cart badge
    cartCount.classList.add('bump');
    setTimeout(() => cartCount.classList.remove('bump'), 300);

    showToast(`تمت إضافة "${title}" إلى سلتكِ بنجاح ✨`);
}

/* Remove Item from Cart */
function removeCartItem(button, priceNum) {
    const item = button.closest('.cart-item');
    if (!item) return;

    item.remove();
    cartItemsCount = Math.max(0, cartItemsCount - 1);
    cartTotal = Math.max(0, cartTotal - priceNum);

    document.getElementById('cartCount').textContent = cartItemsCount;
    document.getElementById('drawerCount').textContent = cartItemsCount;
    document.getElementById('cartSubtotalAmount').textContent = `${cartTotal} ج.م`;

    showToast('تم حذف المنتج من سلتكِ');
}

/* Toast Notice System */
let toastTimeout;
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

/* Newsletter Subscription */
function handleSubscribe(e) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input && input.value) {
        showToast('شكراً لانضمامكِ! كود الخصم في طريقه لبريدكِ ✨');
        input.value = '';
    }
}
