/* =====================================================
   KaayMatesStore – app.js
   Firebase Firestore + Authentication integrado
   ===================================================== */

/* ── Firebase ─────────────────────────────────────── */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXf1M-UDLec9fkiqPwmu7AB5VgDfFzLQg",
  authDomain: "kaaymatesstore.firebaseapp.com",
  projectId: "kaaymatesstore",
  storageBucket: "kaaymatesstore.firebasestorage.app",
  messagingSenderId: "226341748070",
  appId: "1:226341748070:web:48024bcd5ae547ab1f9ca7",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const PRODUCTOS_COL = "productos";
const PEDIDOS_COL   = "pedidos";

/* ── Helpers Firebase ──────────────────────────────── */
async function fb_agregarProducto(data) {
  const ref = await addDoc(collection(db, PRODUCTOS_COL), {
    ...data,
    creadoEn: new Date().toISOString(),
  });
  return ref.id;
}

async function fb_actualizarProducto(firestoreId, data) {
  await updateDoc(doc(db, PRODUCTOS_COL, firestoreId), {
    ...data,
    actualizadoEn: new Date().toISOString(),
  });
}

async function fb_eliminarProducto(firestoreId) {
  await deleteDoc(doc(db, PRODUCTOS_COL, firestoreId));
}

async function fb_guardarPedido(pedido) {
  const ref = await addDoc(collection(db, PEDIDOS_COL), {
    ...pedido,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  });
  return ref.id;
}

/* ── Placeholders SVG ──────────────────────────────── */
const PLACEHOLDER_IMG   = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%231a1814'/%3E%3Ctext x='50%25' y='45%25' font-family='serif' font-size='48' text-anchor='middle' fill='%23c8a96e'%3E%F0%9F%A7%89%3C/text%3E%3Ctext x='50%25' y='68%25' font-family='serif' font-size='14' text-anchor='middle' fill='%237a6540'%3Esin imagen%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_SMALL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%231a1814'/%3E%3Ctext x='50%25' y='62%25' font-family='serif' font-size='28' text-anchor='middle' fill='%23c8a96e'%3E%F0%9F%A7%89%3C/text%3E%3C/svg%3E";
window._ph  = PLACEHOLDER_IMG;
window._phs = PLACEHOLDER_SMALL;

const ALIAS_TRANSFERENCIA = 'santiregner.mp';

/* ── Estado global ─────────────────────────────────── */
let productos        = [];
let carrito          = [];
let filtroActual     = 'todos';
let adminLoggedIn    = false;
let editingProductId = null;

/* ── Helpers UI ─────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

/* ── Auth: escuchar estado de sesión ────────────────── */
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminLoggedIn = true;
  } else {
    adminLoggedIn = false;
    if ($('adminPanel') && !$('adminPanel').hidden) cerrarAdmin();
  }
});

/* ── Auth: login con Firebase ───────────────────────── */
async function intentarLogin() {
  const email = $('adminEmail').value.trim();
  const pass  = $('adminPassword').value;

  if (!email || !pass) {
    Swal.fire({ icon: 'warning', title: 'Completá email y contraseña', confirmButtonColor: '#c8a96e' });
    return;
  }

  const btnLogin = $('btnLoginSubmit');
  btnLogin.disabled = true;
  btnLogin.textContent = 'Ingresando…';

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    cerrarLoginAdmin();
    abrirAdmin();
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: 'Credenciales incorrectas', text: 'Revisá el email y la contraseña.', confirmButtonColor: '#c8a96e' });
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Ingresar';
  }
}

async function cerrarSesionAdmin() {
  await signOut(auth);
  adminLoggedIn = false;
  cerrarAdmin();
}

/* ── Upload de imagen ───────────────────────────────── */
function configurarUploadImagen() {
  const inputFile = document.getElementById('pImagenFile');
  const btnFoto   = document.getElementById('btnTomarFoto');
  const btnQuitar = document.getElementById('btnQuitarFoto');

  btnFoto?.addEventListener('click', () => inputFile.click());

  inputFile?.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      const img = new Image();
      img.onload = function () {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.75);
        document.getElementById('pImagen').value = base64;
        document.getElementById('imagenPreview').src = base64;
        document.getElementById('imagenPreviewWrap').style.display = 'flex';
        lucide.createIcons();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  btnQuitar?.addEventListener('click', function () {
    document.getElementById('pImagen').value = '';
    document.getElementById('imagenPreview').src = '';
    document.getElementById('imagenPreviewWrap').style.display = 'none';
    document.getElementById('pImagenFile').value = '';
  });
}

/* ── Carga de productos (Firestore, tiempo real) ────── */
function escucharProductos() {
  const q = query(collection(db, PRODUCTOS_COL), orderBy("nombre"));
  onSnapshot(q, (snap) => {
    productos = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    renderProductos();
    if ($('adminPanel') && !$('adminPanel').hidden) renderAdminTable();
  }, (err) => {
    console.error("Error al escuchar productos:", err);
  });
}

/* ── Migración (usar una sola vez desde consola) ─────── */
window.migrarProductosAFirestore = async function () {
  const resp = await fetch('productos.json');
  const data = await resp.json();
  let count = 0;
  for (const p of data) {
    const { id, ...sinId } = p;
    await addDoc(collection(db, PRODUCTOS_COL), {
      ...sinId,
      disponible: sinId.disponible !== false,
      creadoEn: new Date().toISOString(),
    });
    count++;
  }
  console.log(`✅ Migración completa: ${count} productos subidos a Firestore.`);
};

/* ── Render tienda ──────────────────────────────────── */
function getProductosFiltrados() {
  const q     = $('searchInput').value.trim().toLowerCase();
  const orden = $('sortSelect').value;

  let lista = productos.filter(p => {
    const pasaFiltro   = filtroActual === 'todos' || p.categoria === filtroActual;
    const pasaBusqueda = !q || p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q);
    return pasaFiltro && pasaBusqueda;
  });

  if (orden === 'precio-asc')       lista.sort((a, b) => a.precio - b.precio);
  else if (orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
  else if (orden === 'nombre-az')   lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else lista.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));

  return lista;
}

function renderProductos() {
  const grid  = $('productsGrid');
  const empty = $('emptyState');
  const lista = getProductosFiltrados();

  if (!lista.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = lista.map(p => {
    const noDisp    = p.disponible === false;
    const enCarrito = carrito.find(c => c.firestoreId === p.firestoreId);
    return `
    <article class="product-card ${noDisp ? 'product-card--agotado' : ''}" data-id="${p.firestoreId}">
      ${p.destacado ? '<span class="product-card__badge">Destacado</span>' : ''}
      ${noDisp ? '<span class="product-card__badge product-card__badge--agotado">Sin stock</span>' : ''}
      <div class="product-card__img-wrap">
        <img class="product-card__img" src="${p.imagen || ''}" alt="${p.nombre}" loading="lazy" onerror="this.onerror=null;this.src=window._ph||''" />
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${p.categoria}</span>
        <h3 class="product-card__name">${p.nombre}</h3>
        <p class="product-card__desc">${p.descripcion || ''}</p>
        <div class="product-card__footer">
          <span class="product-card__price">${fmt(p.precio)}</span>
          <button class="btn-add ${noDisp ? 'btn-add--disabled' : ''}" data-id="${p.firestoreId}" ${noDisp ? 'disabled' : ''}>
            ${enCarrito ? '<i data-lucide="check"></i> Agregado' : '<i data-lucide="plus"></i> Agregar'}
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  lucide.createIcons();

  grid.querySelectorAll('.btn-add:not(.btn-add--disabled)').forEach(btn => {
    btn.addEventListener('click', () => agregarAlCarrito(btn.dataset.id));
  });
}

/* ── Carrito ────────────────────────────────────────── */
function agregarAlCarrito(firestoreId) {
  const prod = productos.find(p => p.firestoreId === firestoreId);
  if (!prod || prod.disponible === false) return;
  const existente = carrito.find(c => c.firestoreId === firestoreId);
  if (existente) existente.cantidad++;
  else carrito.push({ ...prod, cantidad: 1 });
  renderCarrito();
  renderProductos();
  abrirCarrito();
}

function quitarDelCarrito(firestoreId) {
  carrito = carrito.filter(c => c.firestoreId !== firestoreId);
  renderCarrito();
  renderProductos();
}

function cambiarCantidad(firestoreId, delta) {
  const item = carrito.find(c => c.firestoreId === firestoreId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) quitarDelCarrito(firestoreId);
  else renderCarrito();
}

const UMBRAL_ENVIO_GRATIS = 50000;

function renderCarrito() {
  const items  = $('cartItems');
  const empty  = $('cartEmpty');
  const footer = $('cartFooter');
  const count  = $('cartCount');

  const total      = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const totalItems = carrito.reduce((s, c) => s + c.cantidad, 0);
  count.textContent = totalItems;

  if (!carrito.length) {
    items.innerHTML = '';
    empty.hidden    = false;
    footer.hidden   = true;
    return;
  }
  empty.hidden  = false;
  footer.hidden = false;

  const envioGratis = total >= UMBRAL_ENVIO_GRATIS;
  const envio       = envioGratis ? 0 : calcularEnvio('domicilio', PROVINCIAS[0]);
  const faltaParaGratis = UMBRAL_ENVIO_GRATIS - total;

  items.innerHTML = carrito.map(c => `
    <div class="cart-item">
      <img class="cart-item__img" src="${c.imagen || ''}" alt="${c.nombre}" onerror="this.onerror=null;this.src=window._phs||''" />
      <div class="cart-item__info">
        <span class="cart-item__name">${c.nombre}</span>
        <span class="cart-item__price">${fmt(c.precio)}</span>
      </div>
      <div class="cart-item__qty">
        <button class="qty-btn" data-id="${c.firestoreId}" data-delta="-1">−</button>
        <span>${c.cantidad}</span>
        <button class="qty-btn" data-id="${c.firestoreId}" data-delta="1">+</button>
      </div>
      <button class="cart-item__remove" data-id="${c.firestoreId}"><i data-lucide="trash-2"></i></button>
    </div>
  `).join('') + (!envioGratis ? `
    <div class="cart-envio-promo">
      🚚 Te faltan <strong>${fmt(faltaParaGratis)}</strong> para envío gratis
    </div>
  ` : '');

  lucide.createIcons();

  items.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => cambiarCantidad(btn.dataset.id, parseInt(btn.dataset.delta)));
  });
  items.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(btn.dataset.id));
  });

  $('cartSubtotal').textContent = fmt(total);
  $('cartEnvio').textContent    = envioGratis ? 'Gratis 🎉' : fmt(envio) + ' (estimado)';
  $('cartTotal').textContent    = fmt(total + envio);
  empty.hidden = true;
}

function abrirCarrito() {
  $('cartSidebar').setAttribute('aria-hidden', 'false');
  $('cartSidebar').classList.add('open');
  $('overlay').classList.add('active');
}

function cerrarCarrito() {
  $('cartSidebar').setAttribute('aria-hidden', 'true');
  $('cartSidebar').classList.remove('open');
  $('overlay').classList.remove('active');
}

/* ── Checkout ───────────────────────────────────────── */
const TARIFAS_ENVIO = {
  domicilio: {
    'Buenos Aires': 2800, 'CABA': 2800, 'Entre Ríos': 2200, 'Santa Fe': 2500,
    'Córdoba': 2500, 'Corrientes': 2600, 'Misiones': 2900, 'Chaco': 2900,
    'Formosa': 3100, 'Santiago del Estero': 3000, 'Tucumán': 3000, 'Salta': 3200,
    'Jujuy': 3400, 'Catamarca': 3200, 'La Rioja': 3200, 'San Juan': 3300,
    'Mendoza': 3300, 'San Luis': 3100, 'La Pampa': 3200, 'Neuquén': 3500,
    'Río Negro': 3600, 'Chubut': 3900, 'Santa Cruz': 4200, 'Tierra del Fuego': 4800,
  }
};
TARIFAS_ENVIO.sucursal = Object.fromEntries(
  Object.entries(TARIFAS_ENVIO.domicilio).map(([k, v]) => [k, Math.round(v * 0.75)])
);
const PROVINCIAS = Object.keys(TARIFAS_ENVIO.domicilio).sort();

let chkState = {};

function calcularEnvio(tipo, provincia) {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  if (subtotal >= UMBRAL_ENVIO_GRATIS) return 0;
  const tabla = TARIFAS_ENVIO[tipo] || TARIFAS_ENVIO.domicilio;
  return tabla[provincia] || 3000;
}

function abrirCheckout() {
  if (!carrito.length) return;
  cerrarCarrito();
  chkState = { paso: 1, tipoEnvio: 'domicilio', provincia: PROVINCIAS[0], costoEnvio: 0, nombre: '', telefono: '', direccion: '', cp: '', metodoPago: 'transferencia' };
  chkState.costoEnvio = calcularEnvio('domicilio', PROVINCIAS[0]);
  $('checkoutModal').hidden = false;
  document.body.classList.add('no-scroll');
  renderCheckoutPaso1();
}

function renderCheckoutPaso1() {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const resumen  = carrito.map(c =>
    `<tr><td>${c.nombre} <span class="qty-tag">×${c.cantidad}</span></td><td>${fmt(c.precio * c.cantidad)}</td></tr>`
  ).join('');
  const provinciasOpts = PROVINCIAS.map(p =>
    `<option value="${p}" ${p === chkState.provincia ? 'selected' : ''}>${p}</option>`
  ).join('');
  chkState.costoEnvio = calcularEnvio(chkState.tipoEnvio, chkState.provincia);
  const total = subtotal + chkState.costoEnvio;

  $('checkoutInner').innerHTML = `
    ${renderSteps(1)}
    <h3 class="checkout-title">📦 Elegí tu envío</h3>
    <div class="envio-tipo">
      <button class="envio-tipo-btn ${chkState.tipoEnvio === 'domicilio' ? 'active' : ''}" data-tipo="domicilio">
        <span class="envio-icono">🏠</span>
        <div><strong>Envío a domicilio</strong><small>Correo Argentino · 3-7 días hábiles</small></div>
      </button>
      <button class="envio-tipo-btn ${chkState.tipoEnvio === 'sucursal' ? 'active' : ''}" data-tipo="sucursal">
        <span class="envio-icono">🏪</span>
        <div><strong>Retiro en sucursal</strong><small>Correo Argentino · 2-5 días hábiles · 25% menos</small></div>
      </button>
    </div>
    <div class="envio-ubicacion">
      <label class="chk-label">Provincia *</label>
      <select id="chkProvincia">${provinciasOpts}</select>
      <label class="chk-label" style="margin-top:.8rem">Código postal *</label>
      <input type="text" id="chkCP" placeholder="Ej: 3100" value="${chkState.cp}" maxlength="8" />
    </div>
    <div class="costo-envio-preview" id="costoEnvioPreview">
      <span>Costo de envío estimado</span>
      <span class="costo-valor" id="costoValor">${chkState.costoEnvio === 0 ? 'Gratis 🎉' : fmt(chkState.costoEnvio)}</span>
    </div>
    <h3 class="checkout-title" style="margin-top:1.5rem">👤 Tus datos</h3>
    <div class="checkout-datos">
      <input type="text" id="chkNombre" placeholder="Nombre completo *" value="${chkState.nombre}" />
      <input type="text" id="chkTelefono" placeholder="WhatsApp / Teléfono *" value="${chkState.telefono}" />
      ${chkState.tipoEnvio === 'domicilio'
        ? `<input type="text" id="chkDireccion" placeholder="Dirección completa *" value="${chkState.direccion}" />`
        : `<p class="sucursal-nota">🏪 Retirás en la sucursal de Correo Argentino más cercana a tu CP.</p>`}
    </div>
    <div class="checkout-table-wrap">
      <table class="checkout-table">
        <tbody>${resumen}</tbody>
        <tfoot>
          <tr><td>Envío (${chkState.tipoEnvio === 'sucursal' ? 'sucursal' : 'domicilio'})</td><td id="envioFila">${chkState.costoEnvio === 0 ? 'Gratis 🎉' : fmt(chkState.costoEnvio)}</td></tr>
          <tr class="checkout-total"><td><strong>Total</strong></td><td id="totalFila"><strong>${fmt(total)}</strong></td></tr>
        </tfoot>
      </table>
    </div>
    <button class="btn-confirmar" id="btnPaso1Siguiente">Continuar al pago →</button>
  `;
  lucide.createIcons();

  document.querySelectorAll('.envio-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chkState.tipoEnvio = btn.dataset.tipo;
      actualizarCostoEnvio();
      document.querySelectorAll('.envio-tipo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const datosDiv        = document.querySelector('.checkout-datos');
      const existeDireccion = document.getElementById('chkDireccion');
      const existeNota      = document.querySelector('.sucursal-nota');
      if (chkState.tipoEnvio === 'domicilio' && !existeDireccion) {
        if (existeNota) existeNota.remove();
        datosDiv.insertAdjacentHTML('beforeend', `<input type="text" id="chkDireccion" placeholder="Dirección completa *" value="${chkState.direccion}" />`);
      } else if (chkState.tipoEnvio === 'sucursal' && existeDireccion) {
        existeDireccion.remove();
        datosDiv.insertAdjacentHTML('beforeend', `<p class="sucursal-nota">🏪 Retirás en la sucursal de Correo Argentino más cercana a tu CP.</p>`);
      }
    });
  });

  document.getElementById('chkProvincia').addEventListener('change', actualizarCostoEnvio);
  document.getElementById('btnPaso1Siguiente').addEventListener('click', pasarAPago);
}

function actualizarCostoEnvio() {
  const prov = document.getElementById('chkProvincia')?.value || chkState.provincia;
  chkState.provincia  = prov;
  chkState.costoEnvio = calcularEnvio(chkState.tipoEnvio, prov);
  const subtotal   = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const total      = subtotal + chkState.costoEnvio;
  const costoValor = document.getElementById('costoValor');
  const envioFila  = document.getElementById('envioFila');
  const totalFila  = document.getElementById('totalFila');
  const envioTexto = chkState.costoEnvio === 0 ? 'Gratis 🎉' : fmt(chkState.costoEnvio);
  if (costoValor) costoValor.textContent = envioTexto;
  if (envioFila)  envioFila.textContent  = envioTexto;
  if (totalFila)  totalFila.innerHTML    = `<strong>${fmt(total)}</strong>`;
}

function pasarAPago() {
  chkState.nombre    = document.getElementById('chkNombre')?.value.trim() || '';
  chkState.telefono  = document.getElementById('chkTelefono')?.value.trim() || '';
  chkState.direccion = document.getElementById('chkDireccion')?.value.trim() || '';
  chkState.cp        = document.getElementById('chkCP')?.value.trim() || '';
  chkState.provincia = document.getElementById('chkProvincia')?.value || chkState.provincia;

  if (!chkState.nombre || !chkState.telefono || !chkState.cp) {
    Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Completá nombre, teléfono y código postal.', confirmButtonColor: '#c8a96e' });
    return;
  }
  if (chkState.tipoEnvio === 'domicilio' && !chkState.direccion) {
    Swal.fire({ icon: 'warning', title: 'Falta la dirección', text: 'Ingresá tu dirección de entrega.', confirmButtonColor: '#c8a96e' });
    return;
  }
  chkState.paso = 2;
  renderCheckoutPaso2();
}

function renderCheckoutPaso2() {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const total    = subtotal + chkState.costoEnvio;
  const qrData   = encodeURIComponent(`Transferencia KaayMatesStore\nAlias: ${ALIAS_TRANSFERENCIA}\nMonto: ${total}\nCliente: ${chkState.nombre}`);
  const qrUrl    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&color=c8a96e&bgcolor=1a1814`;
  const envioTexto = chkState.costoEnvio === 0 ? 'Gratis 🎉' : fmt(chkState.costoEnvio);

  $('checkoutInner').innerHTML = `
    ${renderSteps(2)}
    <h3 class="checkout-title">💳 Elegí cómo pagar</h3>
    <div class="metodo-pago-grid">
      <button class="metodo-btn ${chkState.metodoPago === 'transferencia' ? 'active' : ''}" data-metodo="transferencia">
        <span class="metodo-icono">🏦</span><strong>Transferencia</strong><small>+ QR de pago</small>
      </button>
      <button class="metodo-btn ${chkState.metodoPago === 'qr' ? 'active' : ''}" data-metodo="qr">
        <span class="metodo-icono">📱</span><strong>Escaneá QR</strong><small>Desde cualquier banco</small>
      </button>
    </div>
    <div class="pago-detalle" id="pagoDetalle"></div>
    <div class="checkout-table-wrap" style="margin-top:1.2rem">
      <table class="checkout-table">
        <tfoot>
          <tr><td>Productos</td><td>${fmt(subtotal)}</td></tr>
          <tr><td>Envío (${chkState.tipoEnvio === 'sucursal' ? 'sucursal' : 'domicilio'} · ${chkState.provincia})</td><td>${envioTexto}</td></tr>
          <tr class="checkout-total"><td><strong>Total a pagar</strong></td><td><strong>${fmt(total)}</strong></td></tr>
        </tfoot>
      </table>
    </div>
    <div class="chk-nav">
      <button class="btn-volver" id="btnVolverPaso1">← Volver</button>
      <button class="btn-confirmar btn-confirmar--inline" id="btnConfirmarPedido">Confirmar pedido →</button>
    </div>
  `;
  lucide.createIcons();
  renderPagoDetalle(total, qrUrl);

  document.querySelectorAll('.metodo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chkState.metodoPago = btn.dataset.metodo;
      document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPagoDetalle(total, qrUrl);
    });
  });
  document.getElementById('btnVolverPaso1').addEventListener('click', () => { chkState.paso = 1; renderCheckoutPaso1(); });
  document.getElementById('btnConfirmarPedido').addEventListener('click', confirmarPedido);
}

function renderPagoDetalle(total, qrUrl) {
  const detalle = document.getElementById('pagoDetalle');
  if (!detalle) return;
  if (chkState.metodoPago === 'transferencia') {
    detalle.innerHTML = `
      <div class="pago-transferencia">
        <div class="pago-transferencia__datos">
          <p>Realizá la transferencia a:</p>
          <div class="dato-fila"><span>Alias</span><strong class="alias-code">${ALIAS_TRANSFERENCIA}</strong></div>
          <div class="dato-fila"><span>Monto</span><strong class="monto-grande">${fmt(total)}</strong></div>
          <p class="pago-note">Después de confirmar, envianos el comprobante por WhatsApp y coordinamos el envío.</p>
        </div>
        <div class="pago-qr-wrap">
          <p class="qr-label">Escaneá para ver los datos</p>
          <img class="pago-qr" src="${qrUrl}" alt="QR transferencia" onerror="this.style.display='none'" />
          <button class="btn-copiar" onclick="navigator.clipboard.writeText('${ALIAS_TRANSFERENCIA}').then(()=>this.textContent='¡Copiado!')">📋 Copiar alias</button>
        </div>
      </div>`;
  } else {
    detalle.innerHTML = `
      <div class="pago-qr-full">
        <p>Escaneá este QR desde la app de tu banco:</p>
        <img class="pago-qr pago-qr--grande" src="${qrUrl}" alt="QR pago" onerror="this.style.display='none'" />
        <p class="pago-note">El QR contiene el alias <strong>${ALIAS_TRANSFERENCIA}</strong> y el monto <strong>${fmt(total)}</strong>.</p>
      </div>`;
  }
}

async function confirmarPedido() {
  const btnConfirmar = document.getElementById('btnConfirmarPedido');
  if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = 'Guardando…'; }

  const subtotal     = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const total        = subtotal + chkState.costoEnvio;
  const resumenTexto = carrito.map(c => `• ${c.nombre} ×${c.cantidad} = ${fmt(c.precio * c.cantidad)}`).join('\n');
  const envioTexto   = chkState.costoEnvio === 0 ? 'Gratis' : fmt(chkState.costoEnvio);

  let pedidoId = null;
  try {
    pedidoId = await fb_guardarPedido({
      nombre:     chkState.nombre,
      telefono:   chkState.telefono,
      provincia:  chkState.provincia,
      cp:         chkState.cp,
      direccion:  chkState.direccion,
      tipoEnvio:  chkState.tipoEnvio,
      costoEnvio: chkState.costoEnvio,
      metodoPago: chkState.metodoPago,
      items: carrito.map(c => ({ firestoreId: c.firestoreId, nombre: c.nombre, precio: c.precio, cantidad: c.cantidad })),
      subtotal,
      total,
    });
  } catch (err) {
    console.error('Error guardando pedido:', err);
    Swal.fire({ icon: 'error', title: 'Error al guardar el pedido', text: 'Revisá tu conexión e intentá de nuevo.', confirmButtonColor: '#c8a96e' });
    if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Confirmar pedido →'; }
    return;
  }

  $('checkoutInner').innerHTML = `
    ${renderSteps(3)}
    <div class="checkout-success">
      <div class="success-icon">🧉</div>
      <h3>¡Pedido confirmado!</h3>
      <p>Gracias <strong>${chkState.nombre}</strong>, ya registramos tu pedido.</p>
      <p style="font-size:.85rem;color:#7a6540">N° de pedido: <code>${pedidoId}</code></p>
      <div class="transfer-box">
        <h4>📲 Realizá tu pago</h4>
        <div class="dato-fila"><span>Alias</span><strong class="alias-code">${ALIAS_TRANSFERENCIA}</strong></div>
        <div class="dato-fila"><span>Monto total</span><strong class="monto-grande">${fmt(total)}</strong></div>
        <p class="pago-note" style="margin-top:.5rem">Envianos el comprobante por WhatsApp al <strong>${chkState.telefono}</strong> y coordinamos el envío.</p>
      </div>
      <div class="envio-confirmado">
        <h4>📦 Datos de envío</h4>
        <p><strong>Tipo:</strong> ${chkState.tipoEnvio === 'domicilio' ? 'Domicilio (Correo Argentino)' : 'Sucursal (Correo Argentino)'}</p>
        <p><strong>Provincia:</strong> ${chkState.provincia} · CP: ${chkState.cp}</p>
        ${chkState.tipoEnvio === 'domicilio' ? `<p><strong>Dirección:</strong> ${chkState.direccion}</p>` : '<p>Retirás en la sucursal más cercana a tu CP.</p>'}
        <p><strong>Costo de envío:</strong> ${envioTexto}</p>
      </div>
      <div class="checkout-resumen-final">
        <h4>Resumen</h4>
        <pre>${resumenTexto}\n\nEnvío (${chkState.tipoEnvio}): ${envioTexto}\nTotal: ${fmt(total)}</pre>
      </div>
      <button class="btn-confirmar" id="btnCerrarCheckout">Entendido ✓</button>
    </div>
  `;
  lucide.createIcons();
  carrito = [];
  renderCarrito();
  renderProductos();
  $('btnCerrarCheckout').addEventListener('click', cerrarCheckout);
}

function renderSteps(activo) {
  const steps = [{ n: 1, label: 'Envío' }, { n: 2, label: 'Pago' }, { n: 3, label: 'Confirmación' }];
  return `<div class="checkout-steps">
    ${steps.map(s => `
      <div class="checkout-step ${s.n === activo ? 'checkout-step--active' : s.n < activo ? 'checkout-step--done' : ''}">
        <span class="checkout-step__num">${s.n < activo ? '✓' : s.n}</span>
        <span>${s.label}</span>
      </div>
      ${s.n < steps.length ? '<div class="step-line"></div>' : ''}
    `).join('')}
  </div>`;
}

function cerrarCheckout() {
  $('checkoutModal').hidden = true;
  document.body.classList.remove('no-scroll');
}

/* ── Admin: login ───────────────────────────────────── */
function abrirLoginAdmin() {
  $('adminLogin').hidden = false;
  $('overlay').classList.add('active');
  $('adminEmail').value    = '';
  $('adminPassword').value = '';
  setTimeout(() => $('adminEmail').focus(), 100);
}

function cerrarLoginAdmin() {
  $('adminLogin').hidden = true;
  $('overlay').classList.remove('active');
}

/* ── Admin: panel ───────────────────────────────────── */
function abrirAdmin() {
  $('adminPanel').hidden = false;
  $('overlay').classList.add('active');
  renderAdminTable();
}

function cerrarAdmin() {
  $('adminPanel').hidden = true;
  if ($('productModal').hidden && $('adminLogin').hidden && $('cartSidebar').getAttribute('aria-hidden') === 'true') {
    $('overlay').classList.remove('active');
  }
}

function renderAdminTable() {
  const tbody = $('adminTableBody');
  tbody.innerHTML = productos.map(p => `
    <tr class="${p.disponible === false ? 'row-agotado' : ''}">
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td>${fmt(p.precio)}</td>
      <td>${p.stock ?? '—'}</td>
      <td>
        <button class="toggle-disp ${p.disponible === false ? 'off' : 'on'}" data-id="${p.firestoreId}">
          ${p.disponible === false ? 'No disp.' : 'Disponible'}
        </button>
      </td>
      <td class="admin-row-actions">
        <button class="btn-edit-prod" data-id="${p.firestoreId}" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn-del-prod" data-id="${p.firestoreId}" title="Eliminar"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();

  tbody.querySelectorAll('.btn-edit-prod').forEach(btn =>
    btn.addEventListener('click', () => abrirModalProducto(btn.dataset.id))
  );
  tbody.querySelectorAll('.btn-del-prod').forEach(btn =>
    btn.addEventListener('click', () => eliminarProducto(btn.dataset.id))
  );
  tbody.querySelectorAll('.toggle-disp').forEach(btn =>
    btn.addEventListener('click', () => toggleDisponibilidad(btn.dataset.id))
  );
}

async function toggleDisponibilidad(firestoreId) {
  const p = productos.find(x => x.firestoreId === firestoreId);
  if (!p) return;
  try {
    await fb_actualizarProducto(firestoreId, { disponible: p.disponible === false ? true : false });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error al actualizar', confirmButtonColor: '#c8a96e' });
  }
}

function eliminarProducto(firestoreId) {
  Swal.fire({
    title: '¿Eliminar producto?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e74c3c',
    cancelButtonColor: '#555',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(async res => {
    if (res.isConfirmed) {
      try {
        await fb_eliminarProducto(firestoreId);
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error al eliminar', confirmButtonColor: '#c8a96e' });
      }
    }
  });
}

/* ── Admin: modal producto ──────────────────────────── */
function abrirModalProducto(firestoreId = null) {
  editingProductId = firestoreId;
  $('productModalTitle').textContent = firestoreId ? 'Editar producto' : 'Nuevo producto';
  $('productModal').hidden = false;

  if (firestoreId) {
    const p = productos.find(x => x.firestoreId === firestoreId);
    if (p) {
      $('pNombre').value      = p.nombre;
      $('pCategoria').value   = p.categoria;
      $('pPrecio').value      = p.precio;
      $('pStock').value       = p.stock ?? 0;
      $('pDescripcion').value = p.descripcion || '';
      $('pImagen').value      = p.imagen || '';
      if (p.imagen) {
        document.getElementById('imagenPreview').src = p.imagen;
        document.getElementById('imagenPreviewWrap').style.display = 'flex';
      } else {
        document.getElementById('imagenPreviewWrap').style.display = 'none';
      }
      $('pDestacado').checked  = !!p.destacado;
      $('pDisponible').checked = p.disponible !== false;
    }
  } else {
    $('productForm').reset();
    document.getElementById('imagenPreviewWrap').style.display = 'none';
    $('pDisponible').checked = true;
  }
}

function cerrarModalProducto() {
  $('productModal').hidden = true;
  editingProductId = null;
  if (!$('adminPanel').hidden) return;
  $('overlay').classList.remove('active');
}

async function guardarProducto() {
  const nombre = $('pNombre').value.trim();
  const precio = parseFloat($('pPrecio').value);
  if (!nombre || isNaN(precio)) {
    Swal.fire({ icon: 'warning', title: 'Completá nombre y precio', confirmButtonColor: '#c8a96e' });
    return;
  }

  const data = {
    nombre,
    categoria:   $('pCategoria').value,
    precio,
    stock:       parseInt($('pStock').value) || 0,
    descripcion: $('pDescripcion').value.trim(),
    imagen:      $('pImagen').value.trim(),
    destacado:   $('pDestacado').checked,
    disponible:  $('pDisponible').checked,
  };

  const btnGuardar = $('btnSaveProduct');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando…';

  try {
    if (editingProductId) {
      await fb_actualizarProducto(editingProductId, data);
    } else {
      await fb_agregarProducto(data);
    }
    cerrarModalProducto();
    Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
  } catch (err) {
    console.error('Error guardando producto:', err);
    Swal.fire({ icon: 'error', title: 'Error al guardar', confirmButtonColor: '#c8a96e' });
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar producto';
  }
}

function exportarJSON() {
  const blob = new Blob([JSON.stringify(productos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'productos.json';
  a.click();
}

/* ── Event Listeners ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  configurarUploadImagen();
  escucharProductos();

  $('heroCta').addEventListener('click', () => $('shop').scrollIntoView({ behavior: 'smooth' }));

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActual = btn.dataset.filter;
      renderProductos();
    });
  });

  $('searchInput').addEventListener('input', renderProductos);
  $('sortSelect').addEventListener('change', renderProductos);

  $('cartToggle').addEventListener('click', abrirCarrito);
  $('cartClose').addEventListener('click', cerrarCarrito);
  $('btnCheckout').addEventListener('click', abrirCheckout);
  $('checkoutClose').addEventListener('click', cerrarCheckout);

  $('overlay').addEventListener('click', () => {
    cerrarCarrito();
    cerrarAdmin();
    cerrarLoginAdmin();
    cerrarCheckout();
    cerrarModalProducto();
  });

  $('adminToggle').addEventListener('click', () => {
    if (adminLoggedIn) abrirAdmin();
    else abrirLoginAdmin();
  });

  $('btnLoginSubmit').addEventListener('click', intentarLogin);
  $('btnLoginCancel').addEventListener('click', cerrarLoginAdmin);
  $('adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); });

  $('adminClose').addEventListener('click', cerrarAdmin);
  $('btnAdminLogout').addEventListener('click', cerrarSesionAdmin);
  $('btnAddProduct').addEventListener('click', () => abrirModalProducto());
  $('btnExportJSON').addEventListener('click', exportarJSON);

  $('productModalClose').addEventListener('click', cerrarModalProducto);
  $('btnCancelProduct').addEventListener('click', cerrarModalProducto);
  $('btnSaveProduct').addEventListener('click', guardarProducto);
});