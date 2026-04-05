// ============================================================
//  script.js — Lógica principal de Daysmell
// ============================================================

// ─────────── ESTADO GLOBAL ───────────
let cart = JSON.parse(localStorage.getItem('daysmell_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('daysmell_wishlist') || '[]');
let currentUser = JSON.parse(localStorage.getItem('daysmell_user') || 'null');
let currentCategory = 'all';
let currentProducts = [];

// ─────────── INICIALIZACIÓN ───────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  updateWishlistUI();
  updateUserUI();
  loadProducts();

  // Buscar en tiempo real
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterProducts, 300));
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') filterProducts(); });
  }
});

// ─────────── PRODUCTOS ───────────
function loadProducts() {
  // Esperar hasta que products.js haya cargado window.PRODUCTS
  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    setTimeout(loadProducts, 100);
    return;
  }
  currentProducts = window.PRODUCTS;
  renderProducts(currentProducts);
}

function renderProducts(products) {
  const container = document.getElementById('products-container');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  const countEl = document.getElementById('product-count');

  if (loadingState) loadingState.style.display = 'none';

  if (!products || products.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    if (countEl) countEl.textContent = '0 productos';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (countEl) countEl.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;

  container.innerHTML = products.map((p, idx) => buildProductCard(p, idx)).join('');
}

function buildProductCard(p, idx) {
  const precio = formatCurrency(p.precio);
  const tieneDescuento = p.descuento > 0 && p.precio_original > 0;
  const originalPrice = tieneDescuento ? formatCurrency(p.precio_original) : '';
  const isWishlisted = wishlist.includes(p.id);
  const inCart = cart.some(c => c.id === p.id);

  // Badge
  let badge = '';
  if (p.es_eco) badge = `<span class="product-badge badge-eco"><i class="fas fa-leaf"></i> ECO</span>`;
  else if (p.categoria === 'outlet') badge = `<span class="product-badge badge-outlet">OUTLET</span>`;
  else if (p.es_nuevo) badge = `<span class="product-badge badge-new">NUEVO</span>`;
  else if (tieneDescuento) badge = `<span class="product-badge badge-sale">-${p.descuento}%</span>`;

  // Stock
  const stockInfo = p.stock === 0
    ? `<span class="product-stock stock-out"><i class="fas fa-times-circle"></i> Sin stock</span>`
    : p.stock <= 3
    ? `<span class="product-stock stock-low"><i class="fas fa-exclamation-circle"></i> Últimas ${p.stock} unidades</span>`
    : `<span class="product-stock stock-ok"><i class="fas fa-check-circle"></i> En stock (${p.stock})</span>`;

  const imagen = p.imagen || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop';

  return `
  <div class="product-card" style="animation-delay:${idx * 0.05}s" data-id="${p.id}">
    <div class="product-image-wrap">
      <img src="${imagen}" alt="${p.nombre}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop'">
      ${badge}
      <button class="btn-wishlist-card ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${p.id}, this)" title="Guardar en lista de deseos">
        <i class="fa${isWishlisted ? 's' : 'r'} fa-heart"></i>
      </button>
      <div class="product-actions-overlay">
        <button class="btn-quick-add" onclick="addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
          <i class="fas fa-plus"></i> Agregar rápido
        </button>
      </div>
    </div>
    <div class="product-info">
      <div class="product-brand">${p.marca || ''}</div>
      <div class="product-name">${p.nombre}</div>
      <div class="product-price-row">
        <span class="product-price">${precio}</span>
        ${tieneDescuento ? `<span class="product-original-price">${originalPrice}</span>` : ''}
        ${tieneDescuento ? `<span class="product-discount">-${p.descuento}%</span>` : ''}
      </div>
      ${stockInfo}
      <button class="btn-add-cart" onclick="addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
        <i class="fas fa-${inCart ? 'check' : 'shopping-bag'}"></i>
        ${inCart ? 'En el carrito' : 'Agregar al carrito'}
      </button>
    </div>
  </div>`;
}

// ─────────── FILTROS ───────────
function filterByCategory(cat, btn) {
  currentCategory = cat;
  // Actualizar tabs activos
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const titleMap = {
    all: '✦ DESTACADOS',
    sneakers: '👟 SNEAKERS',
    mujer: '🔥 MUJER',
    hombre: '🔥 HOMBRE',
    outlet: '🔥 OUTLET',
    ninos: '👶 NIÑOS',
    eco: '🌿 ECO',
    perfumes: '✨ PERFUMES'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titleMap[cat] || 'PRODUCTOS';

  applyFilters();
}

function filterProducts() {
  applyFilters();
}

function applyFilters() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  let filtered = window.PRODUCTS || [];

  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.categoria === currentCategory);
  }

  if (query) {
    filtered = filtered.filter(p =>
      p.nombre?.toLowerCase().includes(query) ||
      p.marca?.toLowerCase().includes(query) ||
      p.categoria?.toLowerCase().includes(query) ||
      p.descripcion?.toLowerCase().includes(query)
    );
  }

  // Aplicar orden actual
  const sortVal = document.getElementById('sort-select')?.value;
  if (sortVal) filtered = applySortTo(filtered, sortVal);

  renderProducts(filtered);
}

function sortProducts(val) {
  applyFilters();
}

function applySortTo(arr, val) {
  const sorted = [...arr];
  switch (val) {
    case 'price-asc': return sorted.sort((a, b) => a.precio - b.precio);
    case 'price-desc': return sorted.sort((a, b) => b.precio - a.precio);
    case 'name-asc': return sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));
    case 'discount': return sorted.sort((a, b) => (b.descuento || 0) - (a.descuento || 0));
    default: return sorted;
  }
}

// ─────────── CARRITO ───────────
function addToCart(productId) {
  const product = window.PRODUCTS.find(p => p.id === productId);
  if (!product || product.stock === 0) return;

  const existing = cart.find(c => c.id === productId);
  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty++;
      showToast(`+1 ${product.nombre}`, 'success');
    } else {
      showToast('Stock máximo alcanzado', 'error');
      return;
    }
  } else {
    cart.push({ id: product.id, nombre: product.nombre, marca: product.marca, precio: product.precio, imagen: product.imagen, qty: 1 });
    showToast(`${product.nombre} agregado`, 'success');
  }

  saveCart();
  updateCartUI();
  renderProducts(getCurrentFilteredProducts());
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.id !== productId);
  saveCart();
  updateCartUI();
  renderCartItems();
  renderProducts(getCurrentFilteredProducts());
}

function changeQty(productId, delta) {
  const item = cart.find(c => c.id === productId);
  if (!item) return;
  const product = window.PRODUCTS.find(p => p.id === productId);
  const maxStock = product ? product.stock : 99;

  item.qty = Math.max(1, Math.min(item.qty + delta, maxStock));
  if (item.qty === 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('daysmell_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);

  const total = cart.reduce((sum, c) => sum + c.precio * c.qty, 0);
  const totalEl = document.getElementById('cart-total');
  const grandEl = document.getElementById('cart-grand-total');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (grandEl) grandEl.textContent = formatCurrency(total);

  renderCartItems();
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>Tu carrito está vacío</p></div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.imagen || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&fit=crop'}" alt="${item.nombre}" onerror="this.src='https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&fit=crop'">
      <div class="cart-item-info">
        <div class="cart-item-brand">${item.marca || ''}</div>
        <div class="cart-item-name">${item.nombre}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)"><i class="fas fa-minus"></i></button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)"><i class="fas fa-plus"></i></button>
          <span class="cart-item-price">${formatCurrency(item.precio * item.qty)}</span>
          <button class="btn-remove-item" onclick="removeFromCart(${item.id})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('active');
  renderCartItems();
}

function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('active');
}

function checkout() {
  if (cart.length === 0) { showToast('Tu carrito está vacío', 'error'); return; }
  if (!currentUser) {
    closeCart();
    openModal('login-modal');
    showToast('Inicia sesión para continuar', 'info');
    return;
  }
  showToast('🎉 ¡Gracias por tu compra, ' + currentUser.nombre + '!', 'success');
  cart = [];
  saveCart();
  updateCartUI();
  closeCart();
}

// ─────────── WISHLIST ───────────
function toggleWishlist(productId, btn) {
  const idx = wishlist.indexOf(productId);
  if (idx === -1) {
    wishlist.push(productId);
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-heart"></i>';
    showToast('Guardado en lista de deseos ❤️', 'success');
  } else {
    wishlist.splice(idx, 1);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="far fa-heart"></i>';
    showToast('Eliminado de lista de deseos', 'info');
  }
  localStorage.setItem('daysmell_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
}

function updateWishlistUI() {
  document.querySelectorAll('.wishlist-count').forEach(el => el.textContent = wishlist.length);
}

// ─────────── AUTENTICACIÓN ───────────
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const users = JSON.parse(localStorage.getItem('daysmell_users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    currentUser = user;
    localStorage.setItem('daysmell_user', JSON.stringify(user));
    updateUserUI();
    closeModal('login-modal');
    showToast(`¡Bienvenido de nuevo, ${user.nombre}! 👋`, 'success');
  } else {
    showToast('Correo o contraseña incorrectos', 'error');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const nombre = document.getElementById('reg-name').value.trim();
  const apellido = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const address = document.getElementById('reg-address').value.trim();

  if (!nombre || !email || !password) { showToast('Completa todos los campos', 'error'); return; }

  const users = JSON.parse(localStorage.getItem('daysmell_users') || '[]');
  if (users.find(u => u.email === email)) {
    showToast('Este correo ya está registrado', 'error');
    return;
  }

  const newUser = { id: Date.now(), nombre, apellido, email, password, address };
  users.push(newUser);
  localStorage.setItem('daysmell_users', JSON.stringify(users));

  currentUser = newUser;
  localStorage.setItem('daysmell_user', JSON.stringify(newUser));
  updateUserUI();
  closeModal('login-modal');
  showToast(`¡Cuenta creada! Bienvenido, ${nombre} 🎉`, 'success');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('daysmell_user');
  updateUserUI();
  showToast('Sesión cerrada', 'info');
}

function updateUserUI() {
  const loginBtn = document.querySelector('.btn-login');
  if (!loginBtn) return;
  if (currentUser) {
    loginBtn.innerHTML = `<i class="fas fa-user-check"></i> ${currentUser.nombre}`;
    loginBtn.onclick = logout;
  } else {
    loginBtn.innerHTML = `<i class="fas fa-user"></i> ENTRAR`;
    loginBtn.onclick = () => openModal('login-modal');
  }
}

// ─────────── MODALS ───────────
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
  document.getElementById(id + '-overlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  document.getElementById(id + '-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

function switchTab(tab) {
  const tabs = document.querySelectorAll('.modal-tab');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (tab === 'login') {
    tabs[0].classList.add('active'); tabs[1].classList.remove('active');
    loginForm.style.display = 'flex'; regForm.style.display = 'none';
  } else {
    tabs[1].classList.add('active'); tabs[0].classList.remove('active');
    regForm.style.display = 'flex'; loginForm.style.display = 'none';
  }
}

// ─────────── EXCEL IMPORT ───────────
function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showToast('⏳ Cargando archivo Excel...', 'info');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        showToast('El archivo Excel está vacío', 'error');
        return;
      }

      const parsed = rows.map((row, i) => parseExcelRow(row, i + 1));
      const valid = parsed.filter(p => p !== null);

      if (valid.length === 0) {
        showToast('No se encontraron productos válidos. Revisa la plantilla.', 'error');
        return;
      }

      window.PRODUCTS = valid;
      loadProducts();
      showToast(`✅ ${valid.length} productos importados desde Excel`, 'success');

    } catch (err) {
      console.error(err);
      showToast('Error al leer el archivo. Usa la plantilla correcta.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function parseExcelRow(row, rowNum) {
  // Campos aceptados (insensible a mayúsculas y espacios)
  const get = (keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
      if (found !== undefined && row[found] !== '') return row[found];
    }
    return '';
  };

  const nombre = String(get(['nombre', 'name', 'producto', 'product']));
  if (!nombre) return null;

  const precio = parseFloat(String(get(['precio', 'price', 'valor'])).replace(/[^0-9.]/g, '')) || 0;
  const precio_original = parseFloat(String(get(['precio_original', 'precio original', 'price_original', 'antes'])).replace(/[^0-9.]/g, '')) || 0;
  const descuento = parseFloat(String(get(['descuento', 'discount', '%'])).replace(/[^0-9.]/g, '')) || 0;
  const stock = parseInt(String(get(['stock', 'cantidad', 'inventory', 'qty'])).replace(/[^0-9]/g, '')) || 0;
  const categoria = String(get(['categoria', 'category', 'tipo'])).toLowerCase().trim() || 'all';
  const marca = String(get(['marca', 'brand', 'fabricante'])).trim();
  const imagen = String(get(['imagen', 'image', 'foto', 'url_imagen', 'image_url'])).trim();
  const descripcion = String(get(['descripcion', 'description', 'detalle'])).trim();
  const es_nuevo = ['si', 'sí', 'yes', 'true', '1'].includes(String(get(['nuevo', 'new', 'es_nuevo'])).toLowerCase());
  const es_eco = ['si', 'sí', 'yes', 'true', '1'].includes(String(get(['eco', 'es_eco'])).toLowerCase());

  return {
    id: Date.now() + rowNum,
    nombre,
    marca,
    categoria,
    precio,
    precio_original,
    descuento,
    stock,
    imagen: imagen || `https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop`,
    descripcion,
    es_nuevo,
    es_eco
  };
}

// ─────────── DESCARGAR PLANTILLA EXCEL ───────────
function downloadTemplate() {
  const templateData = [
    {
      nombre: 'Air Max 90',
      marca: 'Nike',
      categoria: 'sneakers',
      precio: 350000,
      precio_original: 420000,
      descuento: 17,
      stock: 10,
      imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      descripcion: 'Zapatilla icónica con amortiguación Air Max visible.',
      nuevo: 'no',
      eco: 'no'
    },
    {
      nombre: 'Perfume Aqua Di Gio',
      marca: 'Giorgio Armani',
      categoria: 'perfumes',
      precio: 290000,
      precio_original: 0,
      descuento: 0,
      stock: 5,
      imagen: '',
      descripcion: 'Fragancia marina y fresca para hombre. 100ml.',
      nuevo: 'si',
      eco: 'no'
    },
    {
      nombre: 'Jean Eco Denim',
      marca: 'Patagonia',
      categoria: 'eco',
      precio: 195000,
      precio_original: 240000,
      descuento: 19,
      stock: 8,
      imagen: '',
      descripcion: 'Jean fabricado con algodón orgánico certificado.',
      nuevo: 'no',
      eco: 'si'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Ajustar ancho de columnas
  ws['!cols'] = [
    {wch:25},{wch:15},{wch:12},{wch:12},{wch:15},{wch:10},{wch:8},{wch:60},{wch:40},{wch:6},{wch:6}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, 'Daysmell_Plantilla_Productos.xlsx');
  showToast('✅ Plantilla descargada. Llénala y súbela.', 'success');
}

// ─────────── UTILIDADES ───────────
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.textContent = `${icons[type] || '•'} ${message}`;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function getCurrentFilteredProducts() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  let filtered = window.PRODUCTS || [];
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.categoria === currentCategory);
  if (query) filtered = filtered.filter(p =>
    p.nombre?.toLowerCase().includes(query) || p.marca?.toLowerCase().includes(query)
  );
  return filtered;
}

