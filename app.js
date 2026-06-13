/* =====================================================
   KaayMatesStore – app.js
   Firebase Firestore + Authentication integrado
   + Grabado personalizado
   + Carrusel de imágenes por producto
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
const LINK_MERCADOPAGO    = 'https://link.mercadopago.com.ar/kaaymatesstore';
 
/* ── Grabado ────────────────────────────────────────── */
const COSTO_GRABADO = 4000;
 
const TIPOGRAFIAS_GRABADO = [
  {
    id: 'script',
    nombre: 'Script · Cursiva',
    descripcion: 'Elegante y personal',
    googleFont: 'Great Vibes',
    cssFamily: "'Great Vibes', cursive",
  },
  {
    id: 'imprenta',
    nombre: 'Imprenta · Clásica',
    descripcion: 'Clara y atemporal',
    googleFont: 'Cinzel',
    cssFamily: "'Cinzel', serif",
  },
  {
    id: 'gotica',
    nombre: 'Gótica · Ornamental',
    descripcion: 'Dramática y artesanal',
    googleFont: 'UnifrakturMaguntia',
    cssFamily: "'UnifrakturMaguntia', cursive",
  },
];
 
// Precargar fonts de grabado
(function precargarFontsGrabado() {
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cinzel:wght@600&family=UnifrakturMaguntia&display=swap`;
  document.head.appendChild(link);
})();
 
let grabadoModal = {
  open: false,
  productoId: null,
  texto: '',
  tipografiaId: 'script',
};
 
function abrirModalGrabado(firestoreId) {
  const prod = productos.find(p => p.firestoreId === firestoreId);
  if (!prod) return;
 
  grabadoModal.productoId  = firestoreId;
  grabadoModal.texto       = '';
  grabadoModal.tipografiaId = 'script';
 
  const overlay = document.createElement('div');
  overlay.id = 'grabadoOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:3000;
    display:flex;align-items:center;justify-content:center;padding:1rem;
    animation:fadeIn .2s ease;
  `;
 
  const tipOpts = TIPOGRAFIAS_GRABADO.map(t => `
    <button class="grabado-tip-btn ${t.id === grabadoModal.tipografiaId ? 'active' : ''}"
      data-tip="${t.id}" style="font-family:${t.cssFamily}">
      <span class="grabado-tip-sample" style="font-family:${t.cssFamily}">Kaay</span>
      <span class="grabado-tip-info">
        <strong>${t.nombre}</strong>
        <small>${t.descripcion}</small>
      </span>
    </button>
  `).join('');
 
  overlay.innerHTML = `
    <div class="grabado-modal">
      <button class="grabado-close" id="grabadoClose" aria-label="Cerrar">✕</button>
 
      <div class="grabado-header">
        <span class="grabado-badge">✦ Grabado personalizado</span>
        <h2 class="grabado-titulo">${prod.nombre}</h2>
        <p class="grabado-sub">Agregá un texto especial grabado en tu mate · <strong class="grabado-precio">+${fmt(COSTO_GRABADO)}</strong></p>
      </div>
 
      <div class="grabado-body">
 
        <!-- Preview -->
        <div class="grabado-preview-wrap">
          <div class="grabado-preview" id="grabadoPreview">
            <img class="grabado-preview__img" src="${prod.imagen || PLACEHOLDER_IMG}"
              alt="${prod.nombre}" onerror="this.src=window._ph||''" />
            <div class="grabado-preview__texto" id="grabadoTextoPreview"
              style="font-family:${TIPOGRAFIAS_GRABADO[0].cssFamily}">
              Tu texto aquí
            </div>
          </div>
          <p class="grabado-preview__nota">Vista previa aproximada</p>
        </div>
 
        <!-- Controles -->
        <div class="grabado-controles">
 
          <label class="grabado-label">Texto a grabar</label>
          <input
            class="grabado-input"
            id="grabadoInput"
            type="text"
            maxlength="30"
            placeholder="Ej: Para Matías con amor ♥"
            autocomplete="off"
          />
          <span class="grabado-chars"><span id="grabadoChars">0</span>/30 caracteres</span>
 
          <label class="grabado-label" style="margin-top:1.2rem">Tipografía</label>
          <div class="grabado-tips" id="grabadoTips">
            ${tipOpts}
          </div>
 
          <div class="grabado-acciones">
            <button class="grabado-btn-omitir" id="grabadoOmitir">Agregar sin grabado</button>
            <button class="grabado-btn-confirmar" id="grabadoConfirmar">
              <i data-lucide="check"></i> Agregar con grabado · ${fmt(COSTO_GRABADO)}
            </button>
          </div>
 
        </div>
      </div>
    </div>
  `;
 
  document.body.appendChild(overlay);
  lucide.createIcons();
 
  // Listeners
  document.getElementById('grabadoClose').addEventListener('click', cerrarModalGrabado);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModalGrabado(); });
 
  const input   = document.getElementById('grabadoInput');
  const preview = document.getElementById('grabadoTextoPreview');
  const chars   = document.getElementById('grabadoChars');
 
  input.addEventListener('input', () => {
    const val = input.value;
    chars.textContent = val.length;
    preview.textContent = val.trim() || 'Tu texto aquí';
    grabadoModal.texto = val;
  });
 
  document.querySelectorAll('.grabado-tip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.grabado-tip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      grabadoModal.tipografiaId = btn.dataset.tip;
      const tip = TIPOGRAFIAS_GRABADO.find(t => t.id === grabadoModal.tipografiaId);
      preview.style.fontFamily = tip.cssFamily;
    });
  });
 
  document.getElementById('grabadoOmitir').addEventListener('click', () => {
    cerrarModalGrabado();
    agregarAlCarritoDirecto(firestoreId, null);
  });
 
  document.getElementById('grabadoConfirmar').addEventListener('click', () => {
    const texto = input.value.trim();
    if (!texto) {
      input.focus();
      input.classList.add('grabado-input--error');
      setTimeout(() => input.classList.remove('grabado-input--error'), 600);
      return;
    }
    const tip = TIPOGRAFIAS_GRABADO.find(t => t.id === grabadoModal.tipografiaId);
    cerrarModalGrabado();
    agregarAlCarritoDirecto(firestoreId, { texto, tipografia: tip.nombre, tipografiaId: tip.id });
  });
 
  input.focus();
}
 
function cerrarModalGrabado() {
  const el = document.getElementById('grabadoOverlay');
  if (el) el.remove();
}
 
/* ── Estado global ─────────────────────────────────── */
let productos        = [];
let carrito          = [];
let filtroActual     = 'todos';
let adminLoggedIn    = false;
let editingProductId = null;
let imagenesActuales = []; // imágenes del producto en edición (admin)
 
/* ── Helpers UI ─────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
 
/* Devuelve siempre un array de imágenes para un producto (compatibilidad con productos viejos que solo tienen "imagen") */
function getImagenesProducto(p) {
  if (Array.isArray(p.imagenes) && p.imagenes.length) return p.imagenes;
  if (p.imagen) return [p.imagen];
  return [];
}
 
/* ── Auth ───────────────────────────────────────────── */
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminLoggedIn = true;
  } else {
    adminLoggedIn = false;
    if ($('adminPanel') && !$('adminPanel').hidden) cerrarAdmin();
  }
});
 
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
 
/* ── Upload de imágenes (múltiples) ─────────────────── */
function renderImagenesPreview() {
  const grid = document.getElementById('imagenesPreviewGrid');
  if (!grid) return;

  grid.innerHTML = imagenesActuales.map((img, idx) => `
    <div class="img-preview-item">
      <img src="${img}" alt="Imagen ${idx + 1}" />
      ${idx === 0 ? '<span class="img-preview-principal">Principal</span>' : ''}
      <button type="button" class="img-preview-remove" data-idx="${idx}" title="Quitar">✕</button>
    </div>
  `).join('');

  // Mantener compatibilidad: pImagen = primera imagen (principal)
  $('pImagen').value    = imagenesActuales[0] || '';
  $('pImagenes').value  = JSON.stringify(imagenesActuales);

  grid.querySelectorAll('.img-preview-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      imagenesActuales.splice(parseInt(btn.dataset.idx, 10), 1);
      renderImagenesPreview();
    });
  });
}

function configurarUploadImagen() {
  const inputFile = document.getElementById('pImagenFile');
  const btnFoto   = document.getElementById('btnTomarFoto');

  btnFoto?.addEventListener('click', () => inputFile.click());

  inputFile?.addEventListener('change', function () {
    const files = Array.from(this.files || []);
    if (!files.length) return;

    let pendientes = files.length;

    files.forEach(file => {
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

          imagenesActuales.push(base64);

          pendientes--;
          if (pendientes === 0) {
            renderImagenesPreview();
            lucide.createIcons();
            inputFile.value = '';
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
}
 
/* ── Productos (Firestore) ──────────────────────────── */
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
    const esGrabable = !!p.grabable;
    const imgs = getImagenesProducto(p);
    const imgPrincipal = imgs[0] || '';
    return `
    <article class="product-card ${noDisp ? 'product-card--agotado' : ''}" data-id="${p.firestoreId}">
      ${p.destacado ? '<span class="product-card__badge">Destacado</span>' : ''}
      ${noDisp ? '<span class="product-card__badge product-card__badge--agotado">Sin stock</span>' : ''}
      ${esGrabable && !noDisp ? '<span class="product-card__badge product-card__badge--grabado">✦ Grabado disponible</span>' : ''}
      <div class="product-card__img-wrap">
        <img class="product-card__img" src="${imgPrincipal}" alt="${p.nombre}" loading="lazy" onerror="this.onerror=null;this.src=window._ph||''" />
        ${imgs.length > 1 ? `<span class="product-card__img-count"><i data-lucide="images"></i> ${imgs.length}</span>` : ''}
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${p.categoria}</span>
        <h3 class="product-card__name">${p.nombre}</h3>
        <p class="product-card__desc">${p.descripcion || ''}</p>
        <div class="product-card__price-row">
          <span class="product-card__price">${fmt(p.precio)}</span>
        </div>
        <div class="card-actions">
          <button class="btn-add ${noDisp ? 'btn-add--disabled' : ''}" data-id="${p.firestoreId}" ${noDisp ? 'disabled' : ''}>
            ${enCarrito ? '<i data-lucide="check"></i> Agregado' : '<i data-lucide="shopping-bag"></i> Comprar'}
          </button>
          <button class="btn-ver" data-id="${p.firestoreId}">
            <i data-lucide="eye"></i> Ver
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
 
  lucide.createIcons();
 
  grid.querySelectorAll('.btn-add:not(.btn-add--disabled)').forEach(btn => {
    btn.addEventListener('click', () => agregarAlCarrito(btn.dataset.id));
  });

  grid.querySelectorAll('.btn-ver').forEach(btn => {
    btn.addEventListener('click', () => abrirVistaProducto(btn.dataset.id));
  });
}

/* ── Vista de producto con carrusel ─────────────────── */
function abrirVistaProducto(firestoreId) {
  const prod = productos.find(p => p.firestoreId === firestoreId);
  if (!prod) return;

  const imgs = getImagenesProducto(prod);
  const lista = imgs.length ? imgs : [PLACEHOLDER_IMG];

  const carruselHtml = lista.length > 1 ? `
    <div class="swal-carrusel">
      <div class="swal-carrusel__main">
        <button type="button" class="swal-carrusel__arrow swal-carrusel__arrow--prev" id="swalCarruselPrev" aria-label="Anterior">‹</button>
        <img id="swalCarruselImg" src="${lista[0]}" onerror="this.src=window._ph||''"
          style="width:100%;max-height:300px;object-fit:cover;border-radius:8px" />
        <button type="button" class="swal-carrusel__arrow swal-carrusel__arrow--next" id="swalCarruselNext" aria-label="Siguiente">›</button>
      </div>
      <div class="swal-carrusel-thumbs">
        ${lista.map((img, i) => `<img src="${img}" data-idx="${i}" class="swal-thumb ${i === 0 ? 'active' : ''}" onerror="this.src=window._phs||''" />`).join('')}
      </div>
    </div>
  ` : `
    <img src="${lista[0]}" onerror="this.src=window._ph||''"
      style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:1rem" />
  `;

  Swal.fire({
    title: prod.nombre,
    html: `
      ${carruselHtml}
      <p style="color:#8c8272;font-size:.95rem;margin-top:.75rem">${prod.descripcion || 'Sin descripción.'}</p>
      <p style="color:#c8a96e;font-size:1.2rem;font-weight:700;margin-top:.75rem">${fmt(prod.precio)}</p>
    `,
    confirmButtonText: 'Agregar al carrito',
    confirmButtonColor: '#c8a96e',
    showCancelButton: true,
    cancelButtonText: 'Cerrar',
    background: '#1a1814',
    color: '#f0ead8',
    didOpen: () => {
      if (lista.length <= 1) return;

      let idx = 0;
      const imgEl   = document.getElementById('swalCarruselImg');
      const thumbs  = Array.from(document.querySelectorAll('.swal-thumb'));
      const btnPrev = document.getElementById('swalCarruselPrev');
      const btnNext = document.getElementById('swalCarruselNext');

      const irA = (nuevoIdx) => {
        idx = (nuevoIdx + lista.length) % lista.length;
        imgEl.src = lista[idx];
        thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
      };

      thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => irA(parseInt(thumb.dataset.idx, 10)));
      });
      btnPrev?.addEventListener('click', () => irA(idx - 1));
      btnNext?.addEventListener('click', () => irA(idx + 1));
    },
  }).then(res => {
    if (res.isConfirmed) agregarAlCarrito(firestoreId);
  });
}
 
/* ── Carrito ────────────────────────────────────────── */
function agregarAlCarrito(firestoreId) {
  const prod = productos.find(p => p.firestoreId === firestoreId);
  if (!prod || prod.disponible === false) return;
 
  if (prod.grabable) {
    abrirModalGrabado(firestoreId);
    return;
  }
 
  agregarAlCarritoDirecto(firestoreId, null);
}
 
function agregarAlCarritoDirecto(firestoreId, grabado) {
  const prod = productos.find(p => p.firestoreId === firestoreId);
  if (!prod || prod.disponible === false) return;
 
  if (grabado) {
    const itemId = `${firestoreId}_grabado_${Date.now()}`;
    carrito.push({
      ...prod,
      cantidad: 1,
      _itemId: itemId,
      grabado: grabado,
      precio: prod.precio + COSTO_GRABADO,
      precioBase: prod.precio,
    });
  } else {
    const existente = carrito.find(c => c.firestoreId === firestoreId && !c.grabado);
    if (existente) existente.cantidad++;
    else carrito.push({ ...prod, cantidad: 1, _itemId: firestoreId });
  }
 
  renderCarrito();
  renderProductos();
  abrirCarrito();
}
 
function quitarDelCarrito(itemId) {
  carrito = carrito.filter(c => (c._itemId || c.firestoreId) !== itemId);
  renderCarrito();
  renderProductos();
}
 
function cambiarCantidad(itemId, delta) {
  const item = carrito.find(c => (c._itemId || c.firestoreId) === itemId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) quitarDelCarrito(itemId);
  else renderCarrito();
}
 
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
  empty.hidden  = true;
  footer.hidden = false;
 
  items.innerHTML = carrito.map(c => {
    const itemId = c._itemId || c.firestoreId;
    const imgs = getImagenesProducto(c);
    const imgPrincipal = imgs[0] || '';
    const grabadoTag = c.grabado ? `
      <span class="cart-item__grabado">
        ✦ "${c.grabado.texto}" · ${c.grabado.tipografia}
      </span>` : '';
    return `
    <div class="cart-item">
      <img class="cart-item__img" src="${imgPrincipal}" alt="${c.nombre}" onerror="this.onerror=null;this.src=window._phs||''" />
      <div class="cart-item__info">
        <span class="cart-item__name">${c.nombre}</span>
        ${grabadoTag}
        <span class="cart-item__price">${fmt(c.precio)}</span>
      </div>
      <div class="cart-item__qty">
        <button class="qty-btn" data-id="${itemId}" data-delta="-1">−</button>
        <span>${c.cantidad}</span>
        <button class="qty-btn" data-id="${itemId}" data-delta="1">+</button>
      </div>
      <button class="cart-item__remove" data-id="${itemId}"><i data-lucide="trash-2"></i></button>
    </div>`;
  }).join('');
 
  lucide.createIcons();
 
  items.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => cambiarCantidad(btn.dataset.id, parseInt(btn.dataset.delta)));
  });
  items.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(btn.dataset.id));
  });
 
  $('cartSubtotal').textContent = fmt(total);
  $('cartEnvio').textContent    = 'A coordinar por WhatsApp';
  $('cartTotal').textContent    = fmt(total);
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
const UMBRAL_ENVIO_GRATIS_UNUSED = 50000; // mantenido por compatibilidad

let chkState = {};

function abrirCheckout() {
  if (!carrito.length) return;
  cerrarCarrito();
  chkState = {
    nombre: '', apellido: '', telefono: '', email: '',
    tipoEntrega: '', // 'envio' | 'retiro'
    direccion: '', ciudad: '', provincia: '', cp: '',
  };
  $('checkoutModal').hidden = false;
  document.body.classList.add('no-scroll');
  renderFormularioPedido();
}
 
function renderFormularioPedido() {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const resumen  = carrito.map(c => {
    const grabadoInfo = c.grabado ? ` <small class="grabado-resumen-tag">✦ "${c.grabado.texto}"</small>` : '';
    return `<tr><td>${c.nombre}${grabadoInfo} <span class="qty-tag">×${c.cantidad}</span></td><td>${fmt(c.precio * c.cantidad)}</td></tr>`;
  }).join('');

  $('checkoutInner').innerHTML = `
    <h3 class="checkout-title" style="margin-bottom:1.2rem">🧉 Generá tu orden de compra</h3>

    <div class="orden-form">

      <p class="orden-seccion-label">👤 Tus datos</p>
      <div class="orden-fila-2">
        <div class="orden-campo">
          <label class="chk-label">Nombre *</label>
          <input type="text" id="chkNombre" placeholder="Nombre" value="${chkState.nombre}" />
        </div>
        <div class="orden-campo">
          <label class="chk-label">Apellido *</label>
          <input type="text" id="chkApellido" placeholder="Apellido" value="${chkState.apellido}" />
        </div>
      </div>
      <div class="orden-fila-2">
        <div class="orden-campo">
          <label class="chk-label">WhatsApp / Teléfono *</label>
          <input type="tel" id="chkTelefono" placeholder="Ej: 3434123456" value="${chkState.telefono}" />
        </div>
        <div class="orden-campo">
          <label class="chk-label">Correo electrónico</label>
          <input type="email" id="chkEmail" placeholder="tucorreo@mail.com" value="${chkState.email}" />
        </div>
      </div>

      <p class="orden-seccion-label" style="margin-top:1.4rem">📦 ¿Cómo querés recibirlo?</p>
      <div class="envio-tipo">
        <button class="envio-tipo-btn ${chkState.tipoEntrega === 'envio' ? 'active' : ''}" data-entrega="envio">
          <span class="envio-icono">🚚</span>
          <div><strong>Envío a domicilio</strong><small>Coordinamos el costo y los detalles por WhatsApp</small></div>
        </button>
        <button class="envio-tipo-btn ${chkState.tipoEntrega === 'retiro' ? 'active' : ''}" data-entrega="retiro">
          <span class="envio-icono">🏪</span>
          <div><strong>Retiro en local</strong><small>Sin costo de envío · Coordinar día y hora por WhatsApp</small></div>
        </button>
      </div>

      <div id="camposDireccion" style="${chkState.tipoEntrega === 'envio' ? '' : 'display:none'}">
        <p class="orden-seccion-label" style="margin-top:1.4rem">📍 Dirección de entrega <span style="font-weight:400;color:#7a6540">(opcional, podés completarla después)</span></p>
        <div class="orden-campo">
          <label class="chk-label">Calle y número</label>
          <input type="text" id="chkDireccion" placeholder="Ej: San Martín 1234" value="${chkState.direccion}" />
        </div>
        <div class="orden-fila-2">
          <div class="orden-campo">
            <label class="chk-label">Ciudad / Localidad</label>
            <input type="text" id="chkCiudad" placeholder="Ej: Paraná" value="${chkState.ciudad}" />
          </div>
          <div class="orden-campo">
            <label class="chk-label">Provincia</label>
            <input type="text" id="chkProvincia" placeholder="Ej: Entre Ríos" value="${chkState.provincia}" />
          </div>
        </div>
        <div class="orden-campo" style="max-width:200px">
          <label class="chk-label">Código postal</label>
          <input type="text" id="chkCP" placeholder="Ej: 3100" value="${chkState.cp}" maxlength="8" />
        </div>
      </div>

    </div>

    <div class="checkout-table-wrap" style="margin-top:1.5rem">
      <p class="orden-seccion-label">🛒 Resumen de tu pedido</p>
      <table class="checkout-table">
        <tbody>${resumen}</tbody>
        <tfoot>
          <tr><td>Envío</td><td style="color:#c8a96e">A coordinar por WhatsApp</td></tr>
          <tr class="checkout-total"><td><strong>Subtotal productos</strong></td><td><strong>${fmt(subtotal)}</strong></td></tr>
        </tfoot>
      </table>
    </div>

    <button class="btn-confirmar" id="btnGenerarOrden" style="margin-top:1.5rem">
      Generar orden de compra →
    </button>
  `;

  lucide.createIcons();

  // Toggle dirección al elegir entrega
  document.querySelectorAll('.envio-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.envio-tipo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chkState.tipoEntrega = btn.dataset.entrega;
      document.getElementById('camposDireccion').style.display =
        chkState.tipoEntrega === 'envio' ? '' : 'none';
    });
  });

  document.getElementById('btnGenerarOrden').addEventListener('click', generarOrden);
}

async function generarOrden() {
  // Leer campos
  chkState.nombre      = document.getElementById('chkNombre')?.value.trim() || '';
  chkState.apellido    = document.getElementById('chkApellido')?.value.trim() || '';
  chkState.telefono    = document.getElementById('chkTelefono')?.value.trim() || '';
  chkState.email       = document.getElementById('chkEmail')?.value.trim() || '';
  chkState.direccion   = document.getElementById('chkDireccion')?.value.trim() || '';
  chkState.ciudad      = document.getElementById('chkCiudad')?.value.trim() || '';
  chkState.provincia   = document.getElementById('chkProvincia')?.value.trim() || '';
  chkState.cp          = document.getElementById('chkCP')?.value.trim() || '';

  if (!chkState.nombre || !chkState.apellido || !chkState.telefono) {
    Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Completá nombre, apellido y teléfono.', confirmButtonColor: '#c8a96e' });
    return;
  }
  if (!chkState.tipoEntrega) {
    Swal.fire({ icon: 'warning', title: 'Elegí cómo recibir tu pedido', text: 'Seleccioná envío a domicilio o retiro en local.', confirmButtonColor: '#c8a96e' });
    return;
  }

  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);

  // Guardar en Firestore
  let pedidoId = null;
  try {
    pedidoId = await fb_guardarPedido({
      nombre:      chkState.nombre,
      apellido:    chkState.apellido,
      telefono:    chkState.telefono,
      email:       chkState.email,
      tipoEntrega: chkState.tipoEntrega,
      direccion:   chkState.direccion,
      ciudad:      chkState.ciudad,
      provincia:   chkState.provincia,
      cp:          chkState.cp,
      items: carrito.map(c => ({
        firestoreId: c.firestoreId,
        nombre:      c.nombre,
        precio:      c.precio,
        cantidad:    c.cantidad,
        grabado:     c.grabado || null,
      })),
      subtotal,
      total: subtotal,
    });
  } catch (err) {
    console.error('Error guardando pedido:', err);
    Swal.fire({ icon: 'error', title: 'Error al guardar el pedido', text: 'Revisá tu conexión e intentá de nuevo.', confirmButtonColor: '#c8a96e' });
    return;
  }

  // Armar mensaje WhatsApp
  const itemsTexto = carrito.map(c => {
    const grabInfo = c.grabado ? ` ✦ Grabado: "${c.grabado.texto}" (${c.grabado.tipografia})` : '';
    return `  • ${c.nombre}${grabInfo} × ${c.cantidad} → ${fmt(c.precio * c.cantidad)}`;
  }).join('\n');

  const entregaTexto = chkState.tipoEntrega === 'retiro'
    ? '🏪 Retiro en local'
    : '🚚 Envío a domicilio';

  let direccionTexto = '';
  if (chkState.tipoEntrega === 'envio') {
    const partes = [chkState.direccion, chkState.ciudad, chkState.provincia, chkState.cp].filter(Boolean);
    if (partes.length) direccionTexto = `\n📍 Dirección: ${partes.join(', ')}`;
  }

  const emailTexto = chkState.email ? `\n📧 Email: ${chkState.email}` : '';

  const mensaje = `🧉 *ORDEN DE COMPRA – KaayMatesStore*
━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* ${chkState.nombre} ${chkState.apellido}
📱 *Teléfono:* ${chkState.telefono}${emailTexto}
━━━━━━━━━━━━━━━━━━━━
🛒 *Productos:*
${itemsTexto}
━━━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* ${fmt(subtotal)}
${entregaTexto}${direccionTexto}
━━━━━━━━━━━━━━━━━━━━
N° de orden: ${pedidoId}
Hola! Acabo de hacer mi orden en la tienda y quiero coordinar el pago y la entrega 🙌`;

  const urlWsp = `https://wa.me/543434565863?text=${encodeURIComponent(mensaje)}`;

  // Render pantalla de confirmación
  const resumenHtml = carrito.map(c => {
    const grabadoInfo = c.grabado ? ` <small class="grabado-resumen-tag">✦ "${c.grabado.texto}"</small>` : '';
    return `<tr><td>${c.nombre}${grabadoInfo} <span class="qty-tag">×${c.cantidad}</span></td><td>${fmt(c.precio * c.cantidad)}</td></tr>`;
  }).join('');

  $('checkoutInner').innerHTML = `
    <div class="checkout-success">
      <div class="success-icon">🧉</div>
      <h3>¡Orden lista!</h3>
      <p>Gracias <strong>${chkState.nombre}</strong>, tu orden fue generada.</p>
      <p style="font-size:.82rem;color:#7a6540;margin-bottom:1rem">N° de orden: <code>${pedidoId}</code></p>

      <div class="orden-resumen-box">
        <p class="orden-seccion-label" style="margin:0 0 .6rem">Resumen del pedido</p>
        <table class="checkout-table" style="margin:0">
          <tbody>${resumenHtml}</tbody>
          <tfoot>
            <tr class="checkout-total">
              <td><strong>Subtotal</strong></td>
              <td><strong>${fmt(subtotal)}</strong></td>
            </tr>
          </tfoot>
        </table>
        <div class="orden-datos-cliente">
          <p>👤 ${chkState.nombre} ${chkState.apellido} · 📱 ${chkState.telefono}</p>
          ${chkState.email ? `<p>📧 ${chkState.email}</p>` : ''}
          <p>${chkState.tipoEntrega === 'retiro' ? '🏪 Retiro en local' : '🚚 Envío a domicilio'}</p>
          ${chkState.tipoEntrega === 'envio' && (chkState.direccion || chkState.ciudad)
            ? `<p>📍 ${[chkState.direccion, chkState.ciudad, chkState.provincia, chkState.cp].filter(Boolean).join(', ')}</p>`
            : ''}
        </div>
      </div>

      <p class="orden-wsp-nota">Tocá el botón para enviarnos la orden por WhatsApp y coordinamos el pago y la entrega 👇</p>

      <a class="btn-wsp-orden" href="${urlWsp}" target="_blank" rel="noopener">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.856L.057 23.535a.75.75 0 00.916.916l5.743-1.476A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.666-.523-5.188-1.435l-.372-.223-3.862.992.999-3.77-.245-.389A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        Enviar orden por WhatsApp
      </a>

      <button class="btn-confirmar" id="btnCerrarCheckout" style="margin-top:.8rem;background:transparent;border:1.5px solid #c8a96e;color:#c8a96e">
        Cerrar
      </button>
    </div>
  `;

  lucide.createIcons();
  carrito = [];
  renderCarrito();
  renderProductos();
  document.getElementById('btnCerrarCheckout').addEventListener('click', cerrarCheckout);
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
      <td>
        <span class="grabable-tag ${p.grabable ? 'grabable-tag--si' : 'grabable-tag--no'}">
          ${p.grabable ? '✦ Grabable' : '—'}
        </span>
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

      imagenesActuales = getImagenesProducto(p);
      renderImagenesPreview();

      $('pDestacado').checked  = !!p.destacado;
      $('pDisponible').checked = p.disponible !== false;
      $('pGrabable').checked   = !!p.grabable;
    }
  } else {
    $('productForm').reset();
    imagenesActuales = [];
    renderImagenesPreview();
    $('pDisponible').checked = true;
    $('pGrabable').checked   = false;
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
    imagen:      imagenesActuales[0] || '',
    imagenes:    imagenesActuales,
    destacado:   $('pDestacado').checked,
    disponible:  $('pDisponible').checked,
    grabable:    $('pGrabable').checked,
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