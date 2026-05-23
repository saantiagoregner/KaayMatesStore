/* =====================================================
   TuMateEntrerriano – app.js
   Incluye: tienda, carrito, checkout por transferencia,
            panel administrador con CRUD de productos
   ===================================================== */

/* ── Placeholders SVG inline (sin dependencias externas) ── */
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%231a1814'/%3E%3Ctext x='50%25' y='45%25' font-family='serif' font-size='48' text-anchor='middle' fill='%23c8a96e'%3E%F0%9F%A7%89%3C/text%3E%3Ctext x='50%25' y='68%25' font-family='serif' font-size='14' text-anchor='middle' fill='%237a6540'%3Esin imagen%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_SMALL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%231a1814'/%3E%3Ctext x='50%25' y='62%25' font-family='serif' font-size='28' text-anchor='middle' fill='%23c8a96e'%3E%F0%9F%A7%89%3C/text%3E%3C/svg%3E";
window._ph = PLACEHOLDER_IMG;
window._phs = PLACEHOLDER_SMALL;

const ADMIN_PASSWORD = 'mate2025';
const ALIAS_TRANSFERENCIA = 'santiregner.mp';
const STORAGE_KEY = 'tme_productos';
const ADMIN_SESSION = 'tme_admin_session';

/* ── Estado global ─────────────────────────────────── */
let productos = [];
let carrito = [];
let filtroActual = 'todos';
let adminLoggedIn = false;
let editingProductId = null;

/* ── Helpers ────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function genId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/* ── Carga de productos ─────────────────────────────── */
async function cargarProductos() {
  const guardados = localStorage.getItem(STORAGE_KEY);
  if (guardados) {
    productos = JSON.parse(guardados);
  } else {
    try {
      const resp = await fetch('productos.json');
      productos = await resp.json();
      productos = productos.map(p => ({ ...p, disponible: p.disponible !== false }));
      guardarProductos();
    } catch (e) {
      productos = [];
    }
  }
  renderProductos();
}

function guardarProductos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
}

/* ── Render tienda ──────────────────────────────────── */
function getProductosFiltrados() {
  const q = $('searchInput').value.trim().toLowerCase();
  const orden = $('sortSelect').value;

  let lista = productos.filter(p => {
    const pasaFiltro = filtroActual === 'todos' || p.categoria === filtroActual;
    const pasaBusqueda = !q || p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q);
    return pasaFiltro && pasaBusqueda;
  });

  if (orden === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
  else if (orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
  else if (orden === 'nombre-az') lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else lista.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));

  return lista;
}

function renderProductos() {
  const grid = $('productsGrid');
  const empty = $('emptyState');
  const lista = getProductosFiltrados();

  if (!lista.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = lista.map(p => {
    const noDisp = p.disponible === false;
    const enCarrito = carrito.find(c => c.id === p.id);
    return `
    <article class="product-card ${noDisp ? 'product-card--agotado' : ''}" data-id="${p.id}">
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
          <button class="btn-add ${noDisp ? 'btn-add--disabled' : ''}" data-id="${p.id}" ${noDisp ? 'disabled' : ''}>
            ${enCarrito ? '<i data-lucide="check"></i> Agregado' : '<i data-lucide="plus"></i> Agregar'}
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  lucide.createIcons();

  grid.querySelectorAll('.btn-add:not(.btn-add--disabled)').forEach(btn => {
    btn.addEventListener('click', () => agregarAlCarrito(parseInt(btn.dataset.id)));
  });
}

/* ── Carrito ────────────────────────────────────────── */
function agregarAlCarrito(id) {
  const prod = productos.find(p => p.id === id);
  if (!prod || prod.disponible === false) return;
  const existente = carrito.find(c => c.id === id);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ ...prod, cantidad: 1 });
  }
  renderCarrito();
  renderProductos();
  abrirCarrito();
}

function quitarDelCarrito(id) {
  carrito = carrito.filter(c => c.id !== id);
  renderCarrito();
  renderProductos();
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(c => c.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) quitarDelCarrito(id);
  else renderCarrito();
}

function renderCarrito() {
  const items = $('cartItems');
  const empty = $('cartEmpty');
  const footer = $('cartFooter');
  const count = $('cartCount');

  const total = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const totalItems = carrito.reduce((s, c) => s + c.cantidad, 0);
  count.textContent = totalItems;

  if (!carrito.length) {
    items.innerHTML = '';
    empty.hidden = false;
    footer.hidden = true;
    return;
  }
  empty.hidden = true;
  footer.hidden = false;

  items.innerHTML = carrito.map(c => `
    <div class="cart-item">
      <img class="cart-item__img" src="${c.imagen || ''}" alt="${c.nombre}" onerror="this.onerror=null;this.src=window._phs||''" />
      <div class="cart-item__info">
        <span class="cart-item__name">${c.nombre}</span>
        <span class="cart-item__price">${fmt(c.precio)}</span>
      </div>
      <div class="cart-item__qty">
        <button class="qty-btn" data-id="${c.id}" data-delta="-1">−</button>
        <span>${c.cantidad}</span>
        <button class="qty-btn" data-id="${c.id}" data-delta="1">+</button>
      </div>
      <button class="cart-item__remove" data-id="${c.id}"><i data-lucide="trash-2"></i></button>
    </div>
  `).join('');

  lucide.createIcons();

  items.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => cambiarCantidad(parseInt(btn.dataset.id), parseInt(btn.dataset.delta)));
  });
  items.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(parseInt(btn.dataset.id)));
  });

  const envio = total > 10000 ? 0 : 1200;
  $('cartSubtotal').textContent = fmt(total);
  $('cartEnvio').textContent = envio === 0 ? 'Gratis 🎉' : fmt(envio);
  $('cartTotal').textContent = fmt(total + envio);
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

/* ── Checkout ────────────────────────────────────────────
   Flujo de 3 pasos:
     1. Envío  → tipo (domicilio / sucursal) + datos personales
     2. Pago   → transferencia + QR dinámico
     3. Confirmación
   ───────────────────────────────────────────────────────── */

// Tarifas Correo Argentino (referencia, ajustable)
const TARIFAS_ENVIO = {
  domicilio: {
    'Buenos Aires':    2800,
    'CABA':            2800,
    'Entre Ríos':      2200,
    'Santa Fe':        2500,
    'Córdoba':         2500,
    'Corrientes':      2600,
    'Misiones':        2900,
    'Chaco':           2900,
    'Formosa':         3100,
    'Santiago del Estero': 3000,
    'Tucumán':         3000,
    'Salta':           3200,
    'Jujuy':           3400,
    'Catamarca':       3200,
    'La Rioja':        3200,
    'San Juan':        3300,
    'Mendoza':         3300,
    'San Luis':        3100,
    'La Pampa':        3200,
    'Neuquén':         3500,
    'Río Negro':       3600,
    'Chubut':          3900,
    'Santa Cruz':      4200,
    'Tierra del Fuego':4800,
  }
};
TARIFAS_ENVIO.sucursal = Object.fromEntries(
  Object.entries(TARIFAS_ENVIO.domicilio).map(([k,v]) => [k, Math.round(v * 0.75)])
);

const PROVINCIAS = Object.keys(TARIFAS_ENVIO.domicilio).sort();

// Estado checkout
let chkState = {
  paso: 1,
  tipoEnvio: 'domicilio',
  provincia: '',
  costoEnvio: 0,
  nombre: '',
  telefono: '',
  direccion: '',
  cp: '',
  metodoPago: 'transferencia'
};

function calcularEnvio(tipo, provincia) {
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

/* ─── PASO 1: Envío ─── */
function renderCheckoutPaso1() {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const resumen = carrito.map(c =>
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
        <div>
          <strong>Envío a domicilio</strong>
          <small>Correo Argentino · 3-7 días hábiles</small>
        </div>
      </button>
      <button class="envio-tipo-btn ${chkState.tipoEnvio === 'sucursal' ? 'active' : ''}" data-tipo="sucursal">
        <span class="envio-icono">🏪</span>
        <div>
          <strong>Retiro en sucursal</strong>
          <small>Correo Argentino · 2-5 días hábiles · 25% menos</small>
        </div>
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
      <span class="costo-valor" id="costoValor">${fmt(chkState.costoEnvio)}</span>
    </div>

    <h3 class="checkout-title" style="margin-top:1.5rem">👤 Tus datos</h3>
    <div class="checkout-datos">
      <input type="text" id="chkNombre" placeholder="Nombre completo *" value="${chkState.nombre}" />
      <input type="text" id="chkTelefono" placeholder="WhatsApp / Teléfono *" value="${chkState.telefono}" />
      ${chkState.tipoEnvio === 'domicilio' ? `<input type="text" id="chkDireccion" placeholder="Dirección completa *" value="${chkState.direccion}" />` : `<p class="sucursal-nota">🏪 Retirás en la sucursal de Correo Argentino más cercana a tu CP.</p>`}
    </div>

    <div class="checkout-table-wrap">
      <table class="checkout-table">
        <tbody>${resumen}</tbody>
        <tfoot>
          <tr><td>Envío (${chkState.tipoEnvio === 'sucursal' ? 'sucursal' : 'domicilio'})</td><td id="envioFila">${fmt(chkState.costoEnvio)}</td></tr>
          <tr class="checkout-total"><td><strong>Total</strong></td><td id="totalFila"><strong>${fmt(total)}</strong></td></tr>
        </tfoot>
      </table>
    </div>

    <button class="btn-confirmar" id="btnPaso1Siguiente">Continuar al pago →</button>
  `;
  lucide.createIcons();

  // Listeners de tipo envío
  document.querySelectorAll('.envio-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chkState.tipoEnvio = btn.dataset.tipo;
      actualizarCostoEnvio();
      document.querySelectorAll('.envio-tipo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Mostrar/ocultar campo dirección
      const datosDiv = document.querySelector('.checkout-datos');
      const existeDireccion = document.getElementById('chkDireccion');
      const existeNota = document.querySelector('.sucursal-nota');
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
  chkState.provincia = prov;
  chkState.costoEnvio = calcularEnvio(chkState.tipoEnvio, prov);
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const total = subtotal + chkState.costoEnvio;
  const costoValor = document.getElementById('costoValor');
  const envioFila = document.getElementById('envioFila');
  const totalFila = document.getElementById('totalFila');
  if (costoValor) costoValor.textContent = fmt(chkState.costoEnvio);
  if (envioFila) envioFila.textContent = fmt(chkState.costoEnvio);
  if (totalFila) totalFila.innerHTML = `<strong>${fmt(total)}</strong>`;
}

function pasarAPago() {
  chkState.nombre = document.getElementById('chkNombre')?.value.trim() || '';
  chkState.telefono = document.getElementById('chkTelefono')?.value.trim() || '';
  chkState.direccion = document.getElementById('chkDireccion')?.value.trim() || '';
  chkState.cp = document.getElementById('chkCP')?.value.trim() || '';
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

/* ─── PASO 2: Pago ─── */
function renderCheckoutPaso2() {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const total = subtotal + chkState.costoEnvio;

  // QR de transferencia: genera un QR con los datos del pago
  // Usamos la API de QR gratuita de goqr.me (solo genera imagen, sin datos bancarios reales)
  const qrData = encodeURIComponent(`Transferencia TuMateEntrerriano\nAlias: ${ALIAS_TRANSFERENCIA}\nMonto: ${total}\nCliente: ${chkState.nombre}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&color=c8a96e&bgcolor=1a1814`;

  $('checkoutInner').innerHTML = `
    ${renderSteps(2)}
    <h3 class="checkout-title">💳 Elegí cómo pagar</h3>

    <div class="metodo-pago-grid">
      <button class="metodo-btn ${chkState.metodoPago === 'transferencia' ? 'active' : ''}" data-metodo="transferencia">
        <span class="metodo-icono">🏦</span>
        <strong>Transferencia</strong>
        <small>+ QR de pago</small>
      </button>
      <button class="metodo-btn ${chkState.metodoPago === 'qr' ? 'active' : ''}" data-metodo="qr">
        <span class="metodo-icono">📱</span>
        <strong>Escaneá QR</strong>
        <small>Desde cualquier banco</small>
      </button>
    </div>

    <div class="pago-detalle" id="pagoDetalle"></div>

    <div class="checkout-table-wrap" style="margin-top:1.2rem">
      <table class="checkout-table">
        <tfoot>
          <tr><td>Productos</td><td>${fmt(subtotal)}</td></tr>
          <tr><td>Envío (${chkState.tipoEnvio === 'sucursal' ? 'sucursal' : 'domicilio'} · ${chkState.provincia})</td><td>${fmt(chkState.costoEnvio)}</td></tr>
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

  document.getElementById('btnVolverPaso1').addEventListener('click', () => {
    chkState.paso = 1;
    renderCheckoutPaso1();
  });
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
      </div>
    `;
  } else {
    detalle.innerHTML = `
      <div class="pago-qr-full">
        <p>Escaneá este QR desde la app de tu banco para ver los datos del pago:</p>
        <img class="pago-qr pago-qr--grande" src="${qrUrl}" alt="QR pago" onerror="this.style.display='none'" />
        <p class="pago-note">El QR contiene el alias <strong>${ALIAS_TRANSFERENCIA}</strong> y el monto <strong>${fmt(total)}</strong>.</p>
        <p class="pago-note">También podés buscar el alias manualmente en tu banco.</p>
      </div>
    `;
  }
}

/* ─── PASO 3: Confirmación ─── */
function confirmarPedido() {
  const subtotal = carrito.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const total = subtotal + chkState.costoEnvio;
  const resumenTexto = carrito.map(c => `• ${c.nombre} ×${c.cantidad} = ${fmt(c.precio * c.cantidad)}`).join('\n');

  $('checkoutInner').innerHTML = `
    ${renderSteps(3)}
    <div class="checkout-success">
      <div class="success-icon">🧉</div>
      <h3>¡Pedido confirmado!</h3>
      <p>Gracias <strong>${chkState.nombre}</strong>, ya registramos tu pedido.</p>

      <div class="transfer-box">
        <h4>📲 Realizá tu pago</h4>
        <div class="dato-fila"><span>Alias</span><strong class="alias-code">${ALIAS_TRANSFERENCIA}</strong></div>
        <div class="dato-fila"><span>Monto total</span><strong class="monto-grande">${fmt(total)}</strong></div>
        <p class="pago-note" style="margin-top:.5rem">Envianos el comprobante por WhatsApp al <strong>${chkState.telefono || 'tu número'}</strong> y coordinamos el envío.</p>
      </div>

      <div class="envio-confirmado">
        <h4>📦 Datos de envío</h4>
        <p><strong>Tipo:</strong> ${chkState.tipoEnvio === 'domicilio' ? 'Domicilio (Correo Argentino)' : 'Sucursal (Correo Argentino)'}</p>
        <p><strong>Provincia:</strong> ${chkState.provincia} · CP: ${chkState.cp}</p>
        ${chkState.tipoEnvio === 'domicilio' ? `<p><strong>Dirección:</strong> ${chkState.direccion}</p>` : '<p>Retirás en la sucursal más cercana a tu código postal.</p>'}
        <p><strong>Costo de envío:</strong> ${fmt(chkState.costoEnvio)}</p>
      </div>

      <div class="checkout-resumen-final">
        <h4>Resumen</h4>
        <pre>${resumenTexto}\n\nEnvío (${chkState.tipoEnvio}): ${fmt(chkState.costoEnvio)}\nTotal: ${fmt(total)}</pre>
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
  const steps = [
    { n: 1, label: 'Envío' },
    { n: 2, label: 'Pago' },
    { n: 3, label: 'Confirmación' }
  ];
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
  $('adminPassword').value = '';
  setTimeout(() => $('adminPassword').focus(), 100);
}

function cerrarLoginAdmin() {
  $('adminLogin').hidden = true;
  $('overlay').classList.remove('active');
}

function intentarLogin() {
  const pass = $('adminPassword').value;
  if (pass === ADMIN_PASSWORD) {
    adminLoggedIn = true;
    sessionStorage.setItem(ADMIN_SESSION, '1');
    cerrarLoginAdmin();
    abrirAdmin();
  } else {
    Swal.fire({ icon: 'error', title: 'Contraseña incorrecta', confirmButtonColor: '#c8a96e' });
  }
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
        <button class="toggle-disp ${p.disponible === false ? 'off' : 'on'}" data-id="${p.id}">
          ${p.disponible === false ? 'No disp.' : 'Disponible'}
        </button>
      </td>
      <td class="admin-row-actions">
        <button class="btn-edit-prod" data-id="${p.id}" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn-del-prod" data-id="${p.id}" title="Eliminar"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();

  tbody.querySelectorAll('.btn-edit-prod').forEach(btn =>
    btn.addEventListener('click', () => abrirModalProducto(parseInt(btn.dataset.id)))
  );
  tbody.querySelectorAll('.btn-del-prod').forEach(btn =>
    btn.addEventListener('click', () => eliminarProducto(parseInt(btn.dataset.id)))
  );
  tbody.querySelectorAll('.toggle-disp').forEach(btn =>
    btn.addEventListener('click', () => toggleDisponibilidad(parseInt(btn.dataset.id)))
  );
}

function toggleDisponibilidad(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  p.disponible = p.disponible === false ? true : false;
  guardarProductos();
  renderAdminTable();
  renderProductos();
}

function eliminarProducto(id) {
  Swal.fire({
    title: '¿Eliminar producto?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e74c3c',
    cancelButtonColor: '#555',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(res => {
    if (res.isConfirmed) {
      productos = productos.filter(p => p.id !== id);
      guardarProductos();
      renderAdminTable();
      renderProductos();
    }
  });
}

/* ── Admin: modal producto ──────────────────────────── */
function abrirModalProducto(id = null) {
  editingProductId = id;
  $('productModalTitle').textContent = id ? 'Editar producto' : 'Nuevo producto';
  $('productModal').hidden = false;

  if (id) {
    const p = productos.find(x => x.id === id);
    if (p) {
      $('pNombre').value = p.nombre;
      $('pCategoria').value = p.categoria;
      $('pPrecio').value = p.precio;
      $('pStock').value = p.stock ?? 0;
      $('pDescripcion').value = p.descripcion || '';
      $('pImagen').value = p.imagen || '';
      $('pDestacado').checked = !!p.destacado;
      $('pDisponible').checked = p.disponible !== false;
    }
  } else {
    $('productForm').reset();
    $('pDisponible').checked = true;
  }
}

function cerrarModalProducto() {
  $('productModal').hidden = true;
  editingProductId = null;
  // Si el panel admin sigue abierto, mantener overlay activo
  if (!$('adminPanel').hidden) return;
  $('overlay').classList.remove('active');
}

function guardarProducto() {
  const nombre = $('pNombre').value.trim();
  const precio = parseFloat($('pPrecio').value);
  if (!nombre || isNaN(precio)) {
    Swal.fire({ icon: 'warning', title: 'Completá nombre y precio', confirmButtonColor: '#c8a96e' });
    return;
  }

  const data = {
    nombre,
    categoria: $('pCategoria').value,
    precio,
    stock: parseInt($('pStock').value) || 0,
    descripcion: $('pDescripcion').value.trim(),
    imagen: $('pImagen').value.trim(),
    destacado: $('pDestacado').checked,
    disponible: $('pDisponible').checked
  };

  if (editingProductId) {
    const idx = productos.findIndex(p => p.id === editingProductId);
    if (idx >= 0) productos[idx] = { ...productos[idx], ...data };
  } else {
    productos.push({ id: genId(), ...data });
  }

  guardarProductos();
  cerrarModalProducto();
  renderAdminTable();
  renderProductos();
  Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
}

/* ── Export JSON ─────────────────────────────────────── */
function exportarJSON() {
  const blob = new Blob([JSON.stringify(productos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'productos.json';
  a.click();
}

/* ── Event Listeners ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await cargarProductos();

  // Restaurar sesión admin
  if (sessionStorage.getItem(ADMIN_SESSION)) adminLoggedIn = true;

  // Hero CTA
  $('heroCta').addEventListener('click', () => {
    $('shop').scrollIntoView({ behavior: 'smooth' });
  });

  // Filtros nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActual = btn.dataset.filter;
      renderProductos();
    });
  });

  // Búsqueda y ordenamiento
  $('searchInput').addEventListener('input', renderProductos);
  $('sortSelect').addEventListener('change', renderProductos);

  // Carrito
  $('cartToggle').addEventListener('click', abrirCarrito);
  $('cartClose').addEventListener('click', cerrarCarrito);
  $('btnCheckout').addEventListener('click', abrirCheckout);

  // Checkout modal cierre
  $('checkoutClose').addEventListener('click', cerrarCheckout);

  // Overlay
  $('overlay').addEventListener('click', () => {
    cerrarCarrito();
    cerrarAdmin();
    cerrarLoginAdmin();
    cerrarCheckout();
    cerrarModalProducto();
  });

  // Admin botón
  $('adminToggle').addEventListener('click', () => {
    if (adminLoggedIn) {
      abrirAdmin();
    } else {
      abrirLoginAdmin();
    }
  });

  // Login admin
  $('btnLoginSubmit').addEventListener('click', intentarLogin);
  $('btnLoginCancel').addEventListener('click', cerrarLoginAdmin);
  $('adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); });

  // Admin panel
  $('adminClose').addEventListener('click', cerrarAdmin);
  $('btnAddProduct').addEventListener('click', () => abrirModalProducto());
  $('btnExportJSON').addEventListener('click', exportarJSON);

  // Modal producto
  $('productModalClose').addEventListener('click', cerrarModalProducto);
  $('btnCancelProduct').addEventListener('click', cerrarModalProducto);
  $('btnSaveProduct').addEventListener('click', guardarProducto);
});