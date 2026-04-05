// ============================================================
//  vendedor.js — Lógica del Panel de Vendedor Daysmell
// ============================================================

// ─── CREDENCIALES DE VENDEDORES ───
// Puedes agregar más vendedores aquí
const SELLER_ACCOUNTS = [
  { email: 'admin@daysmell.com', password: 'admin123', nombre: 'Admin', rol: 'Administrador' },
  { email: 'vendedor@daysmell.com', password: 'vende123', nombre: 'Vendedor', rol: 'Vendedor' }
];

// ─── ESTADO ───
let currentSeller = null;
let productToDelete = null;

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  // Verificar sesión activa de vendedor
  const session = JSON.parse(sessionStorage.getItem('daysmell_seller') || 'null');
  if (session) {
    currentSeller = session;
    enterDashboard();
  }

  // Fecha actual
  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Preview de imagen en formulario
  const imgInput = document.getElementById('pf-imagen');
  if (imgInput) {
    imgInput.addEventListener('input', debounce(() => {
      const url = imgInput.value.trim();
      const wrap = document.getElementById('image-preview-wrap');
      const prev = document.getElementById('image-preview');
      if (url) {
        wrap.style.display = 'block';
        prev.src = url;
        prev.onerror = () => { wrap.style.display = 'none'; };
      } else {
        wrap.style.display = 'none';
      }
    }, 600));
  }
});

// ─── LOGIN ───
function sellerLogin(e) {
  e.preventDefault();
  const email = document.getElementById('sl-email').value.trim().toLowerCase();
  const password = document.getElementById('sl-password').value;

  const seller = SELLER_ACCOUNTS.find(s => s.email === email && s.password === password);
  if (!seller) {
    showToast('Credenciales incorrectas', 'error');
    return;
  }

  currentSeller = seller;
  sessionStorage.setItem('daysmell_seller', JSON.stringify(seller));
  enterDashboard();
}

function enterDashboard() {
  document.getElementById('seller-login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.body.classList.remove('login-view');

  // Nombre del vendedor en UI
  const initial = (currentSeller.nombre || 'V')[0].toUpperCase();
  document.querySelectorAll('.seller-avatar').forEach(el => el.textContent = initial);
  document.getElementById('seller-name-sidebar').textContent = currentSeller.nombre;
  document.getElementById('seller-name-top').textContent = currentSeller.nombre;

  refreshData();
  showSection('overview');
}

function sellerLogout() {
  sessionStorage.removeItem('daysmell_seller');
  currentSeller = null;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('seller-login-screen').style.display = 'flex';
}

// ─── NAVEGACIÓN ───
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const section = document.getElementById('section-' + name);
  if (section) section.classList.add('active');

  const navLink = document.querySelector(`[data-section="${name}"]`);
  if (navLink) navLink.classList.add('active');

  const titles = {
    overview: 'Resumen',
    products: 'Gestión de productos',
    'add-product': 'Agregar / Editar producto',
    orders: 'Pedidos',
    customers: 'Clientes',
    import: 'Importar Excel'
  };
  const topTitle = document.getElementById('topbar-title');
  if (topTitle) topTitle.textContent = titles[name] || name;

  // Cargar datos según sección
  if (name === 'products') renderProductTable();
  if (name === 'overview') renderOverview();
  if (name === 'customers') renderCustomers();

  // Cerrar sidebar en móvil
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── DATOS: leer / guardar productos ───
function getProducts() {
  const stored = localStorage.getItem('daysmell_products');
  if (stored) return JSON.parse(stored);
  return window.PRODUCTS || [];
}

function saveProducts(products) {
  localStorage.setItem('daysmell_products', JSON.stringify(products));
  window.PRODUCTS = products; // sincronizar con la tienda si está abierta en otra pestaña
}

function refreshData() {
  const products = getProducts();
  const users = JSON.parse(localStorage.getItem('daysmell_users') || '[]');

  // Stats
  document.getElementById('stat-products').textContent = products.length;
  document.getElementById('stat-orders').textContent = '—';
  document.getElementById('stat-customers').textContent = users.length;

  const revenue = products.reduce((sum, p) => sum + p.precio * (p.stock || 0), 0);
  document.getElementById('stat-revenue').textContent = formatCurrency(revenue);

  // Nav badge
  document.getElementById('nav-prod-count').textContent = products.length;
}

// ─── OVERVIEW ───
function renderOverview() {
  refreshData();
  const products = getProducts();

  // Categorías
  const cats = {};
  products.forEach(p => {
    cats[p.categoria] = (cats[p.categoria] || 0) + 1;
  });
  const total = products.length || 1;
  const catEl = document.getElementById('category-breakdown');
  if (catEl) {
    catEl.innerHTML = Object.entries(cats).map(([cat, count]) => `
      <div class="cat-bar-item">
        <div class="cat-bar-label">
          <span>${catLabel(cat)}</span>
          <span style="color:var(--text-muted)">${count} prods</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${Math.round(count/total*100)}%"></div>
        </div>
      </div>
    `).join('') || '<p style="color:var(--text-muted);font-size:.85rem">Sin productos aún</p>';
  }

  // Low stock
  const lowStock = products.filter(p => p.stock <= 3).sort((a,b) => a.stock - b.stock);
  const lowEl = document.getElementById('low-stock-list');
  const countEl = document.getElementById('low-stock-count');
  if (countEl) countEl.textContent = lowStock.length;
  if (lowEl) {
    lowEl.innerHTML = lowStock.length === 0
      ? '<p style="color:var(--text-muted);font-size:.85rem">✅ Todo el stock está bien</p>'
      : lowStock.map(p => `
        <div class="low-stock-item">
          <span>${p.nombre}</span>
          <span class="low-stock-qty ${p.stock === 0 ? 'danger' : ''}">
            ${p.stock === 0 ? 'Sin stock' : p.stock + ' uds'}
          </span>
        </div>
      `).join('');
  }
}

// ─── TABLA DE PRODUCTOS ───
function renderProductTable(filtered) {
  const products = filtered !== undefined ? filtered : getProducts();
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--text-muted)">
      No hay productos. <a onclick="showSection('add-product')" style="color:var(--accent);cursor:pointer">Agregar uno</a>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const stockClass = p.stock === 0 ? 'out' : p.stock <= 3 ? 'low' : 'ok';
    const stockIcon = p.stock === 0 ? 'times-circle' : p.stock <= 3 ? 'exclamation-circle' : 'check-circle';

    return `<tr>
      <td><img class="table-thumb" src="${p.imagen || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=100&fit=crop'}" 
          onerror="this.src='https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=100&fit=crop'" alt="${p.nombre}"></td>
      <td style="max-width:180px;font-weight:500">${p.nombre}</td>
      <td style="color:var(--text-muted)">${p.marca || '—'}</td>
      <td><span class="cat-chip ${p.categoria}">${catLabel(p.categoria)}</span></td>
      <td style="font-weight:700">${formatCurrency(p.precio)}</td>
      <td>${p.descuento > 0 ? `<span style="color:var(--red);font-weight:600">-${p.descuento}%</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>
        <span class="stock-badge ${stockClass}">
          <i class="fas fa-${stockIcon}"></i> ${p.stock}
        </span>
      </td>
      <td>
        <span class="status-dot">
          <span class="dot ${p.stock > 0 ? 'active' : 'inactive'}"></span>
          ${p.stock > 0 ? 'Activo' : 'Sin stock'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editProduct(${p.id})" title="Editar"><i class="fas fa-pencil"></i></button>
          <button class="btn-icon delete" onclick="confirmDelete(${p.id})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterProductTable() {
  const q = (document.getElementById('prod-search')?.value || '').toLowerCase();
  const cat = document.getElementById('prod-cat-filter')?.value || '';
  let products = getProducts();

  if (q) products = products.filter(p =>
    p.nombre?.toLowerCase().includes(q) || p.marca?.toLowerCase().includes(q)
  );
  if (cat) products = products.filter(p => p.categoria === cat);

  renderProductTable(products);
}

// ─── FORMULARIO AGREGAR / EDITAR ───
function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('edit-product-id').value;
  const nombre = document.getElementById('pf-nombre').value.trim();
  const marca = document.getElementById('pf-marca').value.trim();
  const categoria = document.getElementById('pf-categoria').value;
  const precio = parseFloat(document.getElementById('pf-precio').value) || 0;
  const precio_original = parseFloat(document.getElementById('pf-precio-original').value) || 0;
  const descuento = parseFloat(document.getElementById('pf-descuento').value) || 0;
  const stock = parseInt(document.getElementById('pf-stock').value) || 0;
  const imagen = document.getElementById('pf-imagen').value.trim();
  const descripcion = document.getElementById('pf-descripcion').value.trim();
  const es_nuevo = document.getElementById('pf-nuevo').checked;
  const es_eco = document.getElementById('pf-eco').checked;

  const products = getProducts();

  if (id) {
    // Editar existente
    const idx = products.findIndex(p => p.id == id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], nombre, marca, categoria, precio, precio_original, descuento, stock, imagen, descripcion, es_nuevo, es_eco };
      showToast(`✅ "${nombre}" actualizado`, 'success');
    }
  } else {
    // Nuevo producto
    const newProduct = {
      id: Date.now(),
      nombre, marca, categoria, precio, precio_original, descuento, stock,
      imagen: imagen || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop',
      descripcion, es_nuevo, es_eco
    };
    products.unshift(newProduct);
    showToast(`✅ "${nombre}" creado`, 'success');
  }

  saveProducts(products);
  resetProductForm();
  showSection('products');
}

function editProduct(productId) {
  const product = getProducts().find(p => p.id == productId);
  if (!product) return;

  document.getElementById('edit-product-id').value = product.id;
  document.getElementById('pf-nombre').value = product.nombre || '';
  document.getElementById('pf-marca').value = product.marca || '';
  document.getElementById('pf-categoria').value = product.categoria || '';
  document.getElementById('pf-precio').value = product.precio || '';
  document.getElementById('pf-precio-original').value = product.precio_original || '';
  document.getElementById('pf-descuento').value = product.descuento || '';
  document.getElementById('pf-stock').value = product.stock || '';
  document.getElementById('pf-imagen').value = product.imagen || '';
  document.getElementById('pf-descripcion').value = product.descripcion || '';
  document.getElementById('pf-nuevo').checked = product.es_nuevo || false;
  document.getElementById('pf-eco').checked = product.es_eco || false;

  // Preview de imagen
  if (product.imagen) {
    document.getElementById('image-preview-wrap').style.display = 'block';
    document.getElementById('image-preview').src = product.imagen;
  }

  document.getElementById('form-section-title').textContent = `Editar: ${product.nombre}`;
  document.getElementById('save-btn').innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
  showSection('add-product');
}

function resetProductForm() {
  document.getElementById('product-form').reset();
  document.getElementById('edit-product-id').value = '';
  document.getElementById('image-preview-wrap').style.display = 'none';
  document.getElementById('form-section-title').textContent = 'Agregar producto';
  document.getElementById('save-btn').innerHTML = '<i class="fas fa-save"></i> Guardar producto';
}

// ─── ELIMINAR ───
function confirmDelete(productId) {
  productToDelete = productId;
  document.getElementById('confirm-modal').style.display = 'block';
  document.getElementById('confirm-overlay').classList.add('active');
  document.getElementById('confirm-delete-btn').onclick = () => deleteProduct(productId);
}

function closeConfirm() {
  productToDelete = null;
  document.getElementById('confirm-modal').style.display = 'none';
  document.getElementById('confirm-overlay').classList.remove('active');
}

function deleteProduct(productId) {
  let products = getProducts();
  const product = products.find(p => p.id == productId);
  products = products.filter(p => p.id != productId);
  saveProducts(products);
  closeConfirm();
  renderProductTable();
  refreshData();
  showToast(`🗑️ "${product?.nombre || 'Producto'}" eliminado`, 'info');
}

// ─── CLIENTES ───
function renderCustomers() {
  const users = JSON.parse(localStorage.getItem('daysmell_users') || '[]');
  const tbody = document.getElementById('customers-tbody');
  const noEl = document.getElementById('no-customers');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '';
    if (noEl) noEl.style.display = 'flex';
    return;
  }
  if (noEl) noEl.style.display = 'none';

  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td style="color:var(--text-muted)">${i + 1}</td>
      <td style="font-weight:500">${u.nombre} ${u.apellido || ''}</td>
      <td style="color:var(--text-muted)">${u.email}</td>
      <td>${u.address || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td style="color:var(--text-muted)">${u.id ? new Date(u.id).toLocaleDateString('es-CO') : '—'}</td>
    </tr>
  `).join('');
}

// ─── IMPORTAR EXCEL ───
function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('⏳ Leyendo Excel...', 'info');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) { showToast('El archivo está vacío', 'error'); return; }

      const parsed = rows.map((row, i) => parseExcelRow(row, i)).filter(Boolean);
      if (parsed.length === 0) { showToast('No se encontraron datos válidos', 'error'); return; }

      const existing = getProducts();

      // Opción: Reemplazar o combinar
      const merged = [...existing];
      let added = 0, updated = 0;

      parsed.forEach(newP => {
        const existIdx = merged.findIndex(p =>
          p.nombre?.toLowerCase() === newP.nombre?.toLowerCase() && p.marca?.toLowerCase() === newP.marca?.toLowerCase()
        );
        if (existIdx !== -1) { merged[existIdx] = { ...merged[existIdx], ...newP }; updated++; }
        else { merged.push(newP); added++; }
      });

      saveProducts(merged);
      refreshData();
      showSection('products');

      // Resultado
      const resultEl = document.getElementById('import-result');
      const resultBody = document.getElementById('import-result-body');
      const resultTitle = document.getElementById('import-result-title');
      if (resultEl && resultBody) {
        resultEl.style.display = 'block';
        resultTitle.textContent = `✅ Importación completada`;
        resultBody.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem">
            <div style="background:var(--surface2);border-radius:8px;padding:1rem;text-align:center">
              <div style="font-size:1.6rem;font-weight:800;color:var(--green)">${added}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">Productos nuevos</div>
            </div>
            <div style="background:var(--surface2);border-radius:8px;padding:1rem;text-align:center">
              <div style="font-size:1.6rem;font-weight:800;color:var(--blue)">${updated}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">Productos actualizados</div>
            </div>
            <div style="background:var(--surface2);border-radius:8px;padding:1rem;text-align:center">
              <div style="font-size:1.6rem;font-weight:800;color:var(--accent)">${merged.length}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">Total en catálogo</div>
            </div>
          </div>
          <button class="btn-primary" onclick="showSection('products')"><i class="fas fa-box"></i> Ver productos</button>
        `;
      }

      showToast(`✅ ${added} nuevos, ${updated} actualizados`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al leer el Excel. Usa la plantilla.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function parseExcelRow(row, rowNum) {
  const get = (keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
      if (found !== undefined && row[found] !== '') return row[found];
    }
    return '';
  };
  const nombre = String(get(['nombre','name','producto']));
  if (!nombre) return null;
  return {
    id: Date.now() + rowNum,
    nombre,
    marca: String(get(['marca','brand'])).trim(),
    categoria: String(get(['categoria','category','tipo'])).toLowerCase().trim() || 'sneakers',
    precio: parseFloat(String(get(['precio','price'])).replace(/[^0-9.]/g,'')) || 0,
    precio_original: parseFloat(String(get(['precio_original','precio original','antes'])).replace(/[^0-9.]/g,'')) || 0,
    descuento: parseFloat(String(get(['descuento','discount'])).replace(/[^0-9.]/g,'')) || 0,
    stock: parseInt(String(get(['stock','cantidad','qty'])).replace(/[^0-9]/g,'')) || 0,
    imagen: String(get(['imagen','image','foto','url_imagen'])).trim() || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop',
    descripcion: String(get(['descripcion','description'])).trim(),
    es_nuevo: ['si','sí','yes','true','1'].includes(String(get(['nuevo','new','es_nuevo'])).toLowerCase()),
    es_eco: ['si','sí','yes','true','1'].includes(String(get(['eco','es_eco'])).toLowerCase())
  };
}

function downloadTemplate() {
  const data = [
    { nombre:'Air Max 90', marca:'Nike', categoria:'sneakers', precio:350000, precio_original:420000, descuento:17, stock:10, imagen:'https://...', descripcion:'Zapatilla icónica Air Max.', nuevo:'no', eco:'no' },
    { nombre:'Perfume Ejemplo', marca:'Dior', categoria:'perfumes', precio:290000, precio_original:0, descuento:0, stock:5, imagen:'', descripcion:'Fragancia para mujer. 100ml.', nuevo:'si', eco:'no' },
    { nombre:'Jean Eco', marca:'Patagonia', categoria:'eco', precio:195000, precio_original:240000, descuento:19, stock:8, imagen:'', descripcion:'Jean de algodón orgánico.', nuevo:'no', eco:'si' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{wch:25},{wch:15},{wch:12},{wch:12},{wch:15},{wch:10},{wch:8},{wch:60},{wch:40},{wch:6},{wch:6}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, 'Daysmell_Plantilla.xlsx');
  showToast('✅ Plantilla descargada', 'success');
}

// ─── HELPERS ───
function catLabel(cat) {
  const map = { sneakers:'Sneakers', mujer:'Mujer', hombre:'Hombre', outlet:'Outlet', ninos:'Niños', eco:'Eco', perfumes:'Perfumes' };
  return map[cat] || cat;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(amount || 0);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
