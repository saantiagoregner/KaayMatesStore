const estado = {
  productos: [],       
  carrito: [],        
  filtroActivo: 'todos',
  busqueda: '',
  ordenamiento: 'default',
};

const ENVIO_GRATIS_DESDE = 15000; 
const COSTO_ENVIO        = 1500;  


const productsGrid = document.getElementById('productsGrid');
const emptyState   = document.getElementById('emptyState');
const cartCount    = document.getElementById('cartCount');
const cartItems    = document.getElementById('cartItems');
const cartEmpty    = document.getElementById('cartEmpty');
const cartFooter   = document.getElementById('cartFooter');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartEnvio    = document.getElementById('cartEnvio');
const cartTotal    = document.getElementById('cartTotal');
const cartSidebar  = document.getElementById('cartSidebar');
const overlay      = document.getElementById('overlay');
const searchInput  = document.getElementById('searchInput');
const sortSelect   = document.getElementById('sortSelect');


async function inicializarApp() {
  try {
    const respuesta = await fetch('productos.json');
    if (!respuesta.ok) {
      throw new Error(`Error HTTP ${respuesta.status}`);
    }
    estado.productos = await respuesta.json();
    renderizarProductos();
    activarNavBtn('todos');
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error al cargar productos',
      text: 'No se pudieron cargar los productos. Por favor recargá la página.',
      confirmButtonColor: '#6b3a1f',
    });
  }
}
function renderizarProductos() {
  const productosFiltrados = filtrarYOrdenar(estado.productos);

  if (productosFiltrados.length === 0) {
    productsGrid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  productsGrid.innerHTML = productosFiltrados
    .map((producto, indice) => crearTarjetaHTML(producto, indice))
    .join('');
}
function filtrarYOrdenar(productos) {
  let resultado = productos.filter(p => {
    const coincideCategoria =
      estado.filtroActivo === 'todos' || p.categoria === estado.filtroActivo;
    const terminoBusqueda = estado.busqueda.toLowerCase();
    const coincideBusqueda =
      terminoBusqueda === '' ||
      p.nombre.toLowerCase().includes(terminoBusqueda) ||
      p.descripcion.toLowerCase().includes(terminoBusqueda);
    return coincideCategoria && coincideBusqueda;
  });
  resultado = resultado.sort((a, b) => {
    switch (estado.ordenamiento) {
      case 'precio-asc':  return a.precio - b.precio;
      case 'precio-desc': return b.precio - a.precio;
      case 'nombre-az':   return a.nombre.localeCompare(b.nombre);
      default:
        return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
    }
  });

  return resultado;
}

function crearTarjetaHTML(producto, indice) {

  const delay = Math.min(indice * 60, 400);

  return `
    <article class="product-card" style="animation-delay:${delay}ms">
      <div class="product-card__img-wrap">
        ${producto.destacado ? '<span class="product-card__badge">Destacado</span>' : ''}

        <img
          src="${producto.imagen}"
          alt="${producto.nombre}"
          class="product-card__img"
        />

        <span class="product-card__categoria">${producto.categoria}</span>
      </div>

      <div class="product-card__body">
        <h3 class="product-card__nombre">${producto.nombre}</h3>
        <p class="product-card__desc">${producto.descripcion}</p>
      </div>

      <div class="product-card__footer">
        <div>
          <p class="product-card__precio">
            ${formatearPrecio(producto.precio)}
          </p>
        </div>

        <button
          class="btn-agregar"
          data-id="${producto.id}"
          aria-label="Agregar ${producto.nombre} al carrito"
        >
          + Agregar
        </button>
      </div>
    </article>
  `;
}

function agregarAlCarrito(idProducto) {
  const producto = estado.productos.find(p => p.id === idProducto);
  if (!producto) return;

  const itemExistente = estado.carrito.find(item => item.id === idProducto);
  const cantidadActual = itemExistente ? itemExistente.cantidad : 0;

  if (cantidadActual >= producto.stock) {
    Swal.fire({
      icon: 'warning',
      title: 'Stock insuficiente',
      text: `Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}".`,
      confirmButtonColor: '#6b3a1f',
      timer: 3000,
      timerProgressBar: true,
    });
    return;
  }

  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    estado.carrito.push({
      id:       producto.id,
      nombre:   producto.nombre,
      imagen:   producto.imagen,
      precio:   producto.precio,
      cantidad: 1,
    });
  }

  actualizarVistaCarrito();
  mostrarToastAgregado(producto.nombre);
}


function cambiarCantidad(idProducto, delta) {
  const item = estado.carrito.find(i => i.id === idProducto);
  if (!item) return;

  const producto     = estado.productos.find(p => p.id === idProducto);
  const nuevaCantidad = item.cantidad + delta;

  if (nuevaCantidad <= 0) {
    eliminarDelCarrito(idProducto);
    return;
  }

  if (producto && nuevaCantidad > producto.stock) {
    Swal.fire({
      icon: 'warning',
      title: 'Límite de stock',
      text: `Máximo ${producto.stock} unidades.`,
      confirmButtonColor: '#6b3a1f',
      timer: 2000,
      timerProgressBar: true,
    });
    return;
  }

  item.cantidad = nuevaCantidad;
  actualizarVistaCarrito();
}
async function eliminarDelCarrito(idProducto) {
  const item = estado.carrito.find(i => i.id === idProducto);
  if (!item) return;
  const confirmacion = await Swal.fire({
    title: '¿Eliminar producto?',
    text: `¿Querés quitar "${item.nombre}" del carrito?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, quitar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#c0392b',
    cancelButtonColor: '#6b3a1f',
  });
  if (confirmacion.isConfirmed) {
    estado.carrito = estado.carrito.filter(i => i.id !== idProducto);
    actualizarVistaCarrito();
  }
}
async function vaciarCarrito() {
  if (estado.carrito.length === 0) return;
  const confirmacion = await Swal.fire({
    title: '¿Vaciar carrito?',
    text: 'Se eliminarán todos los productos del carrito.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, vaciar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#c0392b',
    cancelButtonColor: '#6b3a1f',
  });

  if (confirmacion.isConfirmed) {
    estado.carrito = [];
    actualizarVistaCarrito();
  }
}
function actualizarVistaCarrito() {
  const totalItems = estado.carrito.reduce((acc, item) => acc + item.cantidad, 0);
  cartCount.textContent = totalItems;
  const hayItems = estado.carrito.length > 0;
  cartEmpty.hidden       = hayItems;
  cartFooter.hidden      = !hayItems;
  cartItems.innerHTML    = hayItems ? estado.carrito.map(crearItemCarritoHTML).join('') : '';
  if (hayItems) {
    const subtotal = calcularSubtotal();
    const envio    = subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
    const total    = subtotal + envio;
    cartSubtotal.textContent = formatearPrecio(subtotal);
    cartEnvio.textContent    = envio === 0 ? '¡Gratis!' : formatearPrecio(envio);
    cartTotal.textContent    = formatearPrecio(total);
  }
}
function crearItemCarritoHTML(item) {
  const subtotal = item.precio * item.cantidad;
  return `
    <div class="cart-item" data-id="${item.id}">
      <img
        src="${item.imagen}"
        alt="${item.nombre}"
        class="cart-item__img"
      />
      <div class="cart-item__info">
        <p class="cart-item__nombre">${item.nombre}</p>
        <p class="cart-item__precio-unit">
          ${formatearPrecio(item.precio)} c/u
        </p>
        <div class="cart-item__controls">
          <button class="qty-btn" data-action="decrementar" data-id="${item.id}">
            −
          </button>
          <span class="qty-value">${item.cantidad}</span>
          <button class="qty-btn" data-action="incrementar" data-id="${item.id}">
            +
          </button>
        </div>
      </div>
      <div class="cart-item__actions">
        <span class="cart-item__subtotal">
          ${formatearPrecio(subtotal)}
        </span>
        <button
          class="cart-item__remove"
          data-action="eliminar"
          data-id="${item.id}"
        >
          🗑️
        </button>
      </div>
    </div>
  `;
}
function calcularSubtotal() {
  return estado.carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
}
async function procesarCheckout() {
  if (estado.carrito.length === 0) return;
  const { value: formData } = await Swal.fire({
    title: '🧉 Datos de entrega',
    html: `
      <input id="swal-nombre" class="swal2-input" placeholder="Nombre y apellido" />
      <input id="swal-localidad" class="swal2-input" placeholder="Localidad (Ej: Paraná, Concordia…)" />
      <input id="swal-email" class="swal2-input" type="email" placeholder="Email para el resumen" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Confirmar pedido',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#4a7c45',
    cancelButtonColor: '#6b3a1f',
    preConfirm: () => {
      const nombre    = document.getElementById('swal-nombre').value.trim();
      const localidad = document.getElementById('swal-localidad').value.trim();
      const email     = document.getElementById('swal-email').value.trim();
      if (!nombre || !localidad || !email) {
        Swal.showValidationMessage('Por favor completá todos los campos');
        return false;
      }
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailValido) {
        Swal.showValidationMessage('Ingresá un email válido');
        return false;
      }
      return { nombre, localidad, email };
    },
  });
  if (!formData) return;
  await simularPago(formData);
}
async function simularPago(datosComprador) {
  Swal.fire({
    title: 'Procesando tu pedido…',
    html: '<p>Aguardá un momento 🧉</p>',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  await new Promise(resolve => setTimeout(resolve, 1800));
  const subtotal    = calcularSubtotal();
  const envio       = subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
  const total       = subtotal + envio;
  const nroPedido   = generarNumeroPedido();
  const resumenItems = estado.carrito
    .map(item => `${item.imagen} ${item.nombre} x${item.cantidad} — ${formatearPrecio(item.precio * item.cantidad)}`)
    .join('<br/>');
  Swal.fire({
    icon: 'success',
    title: '¡Pedido confirmado! 🎉',
    html: `
      <p><strong>Gracias, ${datosComprador.nombre}!</strong></p>
      <p style="font-size:0.9rem;color:#7a5840;margin:0.5rem 0 1rem">
        Pedido N° <strong>${nroPedido}</strong> · Envío a ${datosComprador.localidad}
      </p>
      <div style="background:#f5efe3;border-radius:8px;padding:1rem;text-align:left;font-size:0.88rem;line-height:1.8">
        ${resumenItems}
        <hr style="margin:0.5rem 0;border-color:#e8dcc8"/>
        <strong>Total: ${formatearPrecio(total)}</strong>
        ${envio === 0 ? ' <span style="color:#4a7c45">(¡Envío gratis!)</span>' : ''}
      </div>
      <p style="font-size:0.82rem;color:#7a5840;margin-top:0.75rem">
        Recibirás el resumen en <strong>${datosComprador.email}</strong>
      </p>
    `,
    confirmButtonText: 'Seguir comprando',
    confirmButtonColor: '#4a7c45',
    width: '500px',
  });
  estado.carrito.forEach(item => {
  const producto = estado.productos.find(p => p.id === item.id);
  if (producto) {
    producto.stock -= item.cantidad;
  }
  });
  estado.carrito = [];
  renderizarProductos();
  actualizarVistaCarrito();
  cerrarCarrito();
}
function generarNumeroPedido() {
  return `TME-${Date.now().toString().slice(-6)}`;
}
function abrirCarrito() {
  cartSidebar.classList.add('open');
  cartSidebar.setAttribute('aria-hidden', 'false');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function cerrarCarrito() {
  cartSidebar.classList.remove('open');
  cartSidebar.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function mostrarToastAgregado(nombreProducto) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
    background: '#3e1e08',
    color: '#f5efe3',
    iconColor: '#7ab648',
  });
  Toast.fire({
    icon: 'success',
    title: `"${nombreProducto}" agregado al carrito`,
  });
}
function formatearPrecio(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto);
}
function activarNavBtn(filtro) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filtro);
  });
}
productsGrid.addEventListener('click', evento => {
  const btnAgregar = evento.target.closest('.btn-agregar');
  if (!btnAgregar || btnAgregar.disabled) return;
  const idProducto = parseInt(btnAgregar.dataset.id, 10);
  agregarAlCarrito(idProducto);
});
cartItems.addEventListener('click', evento => {
  const boton = evento.target.closest('[data-action]');
  if (!boton) return;
  const idProducto = parseInt(boton.dataset.id, 10);
  const accion     = boton.dataset.action;
  if (accion === 'incrementar') cambiarCantidad(idProducto, +1);
  if (accion === 'decrementar') cambiarCantidad(idProducto, -1);
  if (accion === 'eliminar')    eliminarDelCarrito(idProducto);
});
document.getElementById('cartToggle').addEventListener('click', abrirCarrito);
document.getElementById('cartClose').addEventListener('click', cerrarCarrito);
overlay.addEventListener('click', cerrarCarrito);
document.getElementById('btnCheckout').addEventListener('click', procesarCheckout);
document.querySelector('.header__nav').addEventListener('click', evento => {
  const btnFiltro = evento.target.closest('.nav-btn');
  if (!btnFiltro) return;
  estado.filtroActivo = btnFiltro.dataset.filter;
  activarNavBtn(estado.filtroActivo);
  renderizarProductos();
});
searchInput.addEventListener('input', evento => {
  estado.busqueda = evento.target.value;
  renderizarProductos();
});
sortSelect.addEventListener('change', evento => {
  estado.ordenamiento = evento.target.value;
  renderizarProductos();
});
document.getElementById('heroCta').addEventListener('click', () => {
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
});
document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape') cerrarCarrito();
});
inicializarApp();
