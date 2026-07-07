const state = {
  products: [],
  filtered: [],
  promocodes: [],
  activePromo: null,
};

const els = {
  popular: document.getElementById('popularProducts'),
  grid: document.getElementById('productGrid'),
  found: document.getElementById('foundCount'),
  empty: document.getElementById('emptyState'),
  search: document.getElementById('searchInput'),
  size: document.getElementById('sizeFilter'),
  price: document.getElementById('priceFilter'),
  color: document.getElementById('colorFilter'),
  material: document.getElementById('materialFilter'),
  stock: document.getElementById('stockFilter'),
  reset: document.getElementById('resetFilters'),
  emptyReset: document.getElementById('emptyReset'),
  modal: document.getElementById('productModal'),
  modalContent: document.getElementById('modalContent'),
  modalClose: document.getElementById('modalClose'),
  promoForm: document.getElementById('promoForm'),
  promoInput: document.getElementById('promoInput'),
  promoMessage: document.getElementById('promoMessage'),
  promoClear: document.getElementById('promoClear'),
};

document.getElementById('year').textContent = new Date().getFullYear();

document.querySelector('.menu-toggle').addEventListener('click', () => {
  document.querySelector('.nav').classList.toggle('open');
});

async function loadProducts() {
  try {
    const [productsResponse, promoResponse] = await Promise.all([
      fetch('products.json', { cache: 'no-store' }),
      fetch('promocodes.json', { cache: 'no-store' }).catch(() => null),
    ]);

    if (!productsResponse.ok) throw new Error('Не удалось загрузить products.json');

    const products = await productsResponse.json();
    state.products = products
      .filter(product => String(product.status || '').toLowerCase() !== 'hide')
      .sort((a, b) => Number(a.sort || 999) - Number(b.sort || 999));

    if (promoResponse && promoResponse.ok) {
      state.promocodes = await promoResponse.json();
      restoreSavedPromo();
    }

    setupFilters();
    renderPopular();
    applyFilters();
    updatePromoMessage();
  } catch (error) {
    console.error(error);
    els.found.textContent = 'Ошибка загрузки товаров';
    els.grid.innerHTML = `<div class="empty-state"><h3>Не удалось загрузить товары</h3><p>Проверьте файл products.json и пути к фотографиям.</p></div>`;
  }
}

function setupFilters() {
  fillSelect(els.size, unique('size'));
  fillSelect(els.color, unique('color'));
  fillSelect(els.material, unique('material'));
}

function unique(key) {
  return [...new Set(state.products.map(item => item[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'ru'));
}

function fillSelect(select, values) {
  const first = select.querySelector('option');
  select.innerHTML = '';
  select.appendChild(first);
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function applyFilters() {
  const query = els.search.value.trim().toLowerCase();
  const size = els.size.value;
  const color = els.color.value;
  const material = els.material.value;
  const stock = els.stock.value;
  const price = els.price.value;

  state.filtered = state.products.filter(product => {
    const searchable = [product.id, product.title, product.category, product.size, product.color, product.material]
      .join(' ')
      .toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (size !== 'all' && product.size !== size) return false;
    if (color !== 'all' && product.color !== color) return false;
    if (material !== 'all' && product.material !== material) return false;
    if (stock !== 'all' && !isInStock(product, stock)) return false;
    if (price !== 'all') {
      const [min, max] = price.split('-').map(Number);
      const productPrice = Number(product.price || 0);
      if (productPrice < min || productPrice > max) return false;
    }
    return true;
  });

  renderProducts(state.filtered);
}

function isInStock(product, key) {
  const value = String(product[key] || '').toLowerCase();
  return ['да', 'в наличии', 'true', 'yes', '1'].some(token => value.includes(token));
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function renderPopular() {
  const items = state.products.filter(p => p.featured).slice(0, 4);
  els.popular.innerHTML = items.map(productCard).join('');
}

function renderProducts(products) {
  els.found.textContent = `Найдено: ${products.length} ${declOfNum(products.length, ['товар', 'товара', 'товаров'])}`;
  els.empty.hidden = products.length !== 0;
  els.grid.innerHTML = products.map(productCard).join('');
}

function productCard(product) {
  const label = product.label ? `<div class="label-badge">${escapeHtml(product.label)}</div>` : '';
  const promo = getProductPromo(product);
  const priceBlock = productPriceBlock(product, promo);

  return `
    <article class="product-card">
      ${label}
      <div class="product-image"><img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.title)}" loading="lazy"></div>
      <div class="product-body">
        <div class="product-title">${escapeHtml(product.title)}</div>
        ${priceBlock}
        <div class="meta">
          ${product.size ? `<span>${escapeHtml(product.size)}</span>` : ''}
          ${product.color ? `<span>${escapeHtml(product.color)}</span>` : ''}
          ${product.material ? `<span>${escapeHtml(product.material)}</span>` : ''}
        </div>
        <div class="stock">
          <span class="${isInStock(product, 'voronezh') ? '' : 'no'}">● Воронеж: ${escapeHtml(product.voronezh || 'уточнить')}</span>
          <span class="${isInStock(product, 'lipetsk') ? '' : 'no'}">● Липецк: ${escapeHtml(product.lipetsk || 'уточнить')}</span>
          <span class="${isInStock(product, 'avito') ? '' : 'no'}">● Авито Доставка: ${escapeHtml(product.avito || 'уточнить')}</span>
        </div>
        <button class="btn details-btn" type="button" onclick="openProduct('${escapeAttr(product.id)}')">Характеристики</button>
      </div>
    </article>
  `;
}

function productPriceBlock(product, promo) {
  const originalPrice = Number(product.price || 0);
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : 0;

  if (!promo) {
    return `
      <div class="product-price">
        <strong>${formatPrice(originalPrice)}</strong>
        ${oldPrice ? `<del>${formatPrice(oldPrice)}</del>` : ''}
      </div>
    `;
  }

  return `
    <div class="product-price promo-price">
      <strong>${formatPrice(promo.finalPrice)}</strong>
      <del>${formatPrice(originalPrice)}</del>
    </div>
    <div class="promo-badge-small">Промокод ${escapeHtml(state.activePromo.code)}: −${formatPrice(promo.discount)}</div>
  `;
}

function openProduct(id) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;

  const features = String(product.features || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);

  const promo = getProductPromo(product);
  const modalPrice = promo
    ? `<div class="modal-price promo-modal-price"><strong>${formatPrice(promo.finalPrice)}</strong><del>${formatPrice(product.price)}</del></div>
       <div class="promo-note">Промокод ${escapeHtml(state.activePromo.code)} применён. Назовите его продавцу для получения скидки.</div>`
    : `<div class="modal-price">${formatPrice(product.price)}</div>`;

  els.modalContent.innerHTML = `
    <div class="modal-image"><img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.title)}"></div>
    <div class="modal-info">
      ${product.label ? `<div class="eyebrow">${escapeHtml(product.label)}</div>` : ''}
      <h3>${escapeHtml(product.title)}</h3>
      ${modalPrice}
      <div class="specs">
        ${spec('Артикул', product.id)}
        ${spec('Категория', product.category)}
        ${spec('Размер', product.size)}
        ${spec('Цвет', product.color)}
        ${spec('Материал', product.material)}
        ${spec('Высота', product.height ? `${product.height} см` : '')}
        ${spec('Ширина', product.width ? `${product.width} см` : '')}
        ${spec('Глубина', product.depth ? `${product.depth} см` : '')}
        ${spec('Вес', product.weight ? `${product.weight} кг` : '')}
        ${spec('Воронеж', product.voronezh)}
        ${spec('Липецк', product.lipetsk)}
        ${spec('Авито Доставка', product.avito)}
      </div>
      ${features.length ? `<h4>Особенности</h4><ul class="features-list">${features.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    </div>
  `;
  els.modal.showModal();
}

function spec(label, value) {
  if (!value) return '';
  return `<div><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}

function findPromoByCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  return state.promocodes.find(promo => String(promo.code || '').trim().toUpperCase() === normalized && promo.active !== false) || null;
}

function promoAppliesToProduct(product, promo) {
  const price = Number(product.price || 0);
  if (!promo || promo.active === false) return false;
  if (promo.minPrice && price < Number(promo.minPrice)) return false;
  if (Array.isArray(promo.sizes) && promo.sizes.length && !promo.sizes.includes(product.size)) return false;
  if (Array.isArray(promo.categories) && promo.categories.length && !promo.categories.includes(product.category)) return false;
  if (Array.isArray(promo.materials) && promo.materials.length && !promo.materials.includes(product.material)) return false;
  if (Array.isArray(promo.colors) && promo.colors.length && !promo.colors.includes(product.color)) return false;
  if (Array.isArray(promo.products) && promo.products.length && !promo.products.includes(product.id)) return false;
  return true;
}

function calculatePromo(product, promo) {
  const price = Number(product.price || 0);
  if (!promoAppliesToProduct(product, promo)) return null;

  let discount = 0;
  if (promo.type === 'percent') {
    discount = Math.round(price * Number(promo.value || 0) / 100);
  } else {
    discount = Number(promo.value || 0);
  }

  if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));
  discount = Math.max(0, Math.min(discount, price - 1));

  if (!discount) return null;
  return {
    discount,
    finalPrice: price - discount,
  };
}

function getProductPromo(product) {
  return calculatePromo(product, state.activePromo);
}

function applyPromoCode(code) {
  const promo = findPromoByCode(code);

  if (!promo) {
    state.activePromo = null;
    localStorage.removeItem('flybagsPromo');
    updatePromoMessage('Промокод не найден или отключён.', 'error');
    renderPopular();
    applyFilters();
    return;
  }

  state.activePromo = promo;
  localStorage.setItem('flybagsPromo', promo.code);
  els.promoInput.value = promo.code;
  updatePromoMessage();
  renderPopular();
  applyFilters();
}

function clearPromo() {
  state.activePromo = null;
  els.promoInput.value = '';
  localStorage.removeItem('flybagsPromo');
  updatePromoMessage('Промокод убран. Показываем обычные цены.', 'neutral');
  renderPopular();
  applyFilters();
}

function updatePromoMessage(customText = '', type = '') {
  if (!els.promoMessage) return;

  els.promoMessage.className = 'promo-message';
  if (type) els.promoMessage.classList.add(type);

  if (customText) {
    els.promoMessage.textContent = customText;
    els.promoClear.hidden = !state.activePromo;
    return;
  }

  if (!state.activePromo) {
    els.promoMessage.textContent = 'Доступные тестовые промокоды: FLY300, FLY500, SET1000, SALE10.';
    els.promoClear.hidden = true;
    return;
  }

  const applicableCount = state.products.filter(product => promoAppliesToProduct(product, state.activePromo)).length;
  els.promoMessage.classList.add('success');
  els.promoMessage.textContent = `Промокод ${state.activePromo.code} применён: ${state.activePromo.title || 'скидка рассчитана'}. Подходит к ${applicableCount} ${declOfNum(applicableCount, ['товару', 'товарам', 'товарам'])}.`;
  els.promoClear.hidden = false;
}

function restoreSavedPromo() {
  const savedCode = localStorage.getItem('flybagsPromo');
  if (!savedCode) return;
  const promo = findPromoByCode(savedCode);
  if (promo) {
    state.activePromo = promo;
    els.promoInput.value = promo.code;
  }
}

function resetFilters() {
  els.search.value = '';
  els.size.value = 'all';
  els.price.value = 'all';
  els.color.value = 'all';
  els.material.value = 'all';
  els.stock.value = 'all';
  applyFilters();
}

function quickFilter(type, value) {
  resetFilters();
  if (type === 'size') els.size.value = value;
  if (type === 'category') {
    els.search.value = value;
  }
  applyFilters();
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
}

function declOfNum(number, words) {
  const cases = [2, 0, 1, 1, 1, 2];
  return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[Math.min(number % 10, 5)]];
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

[els.search, els.size, els.price, els.color, els.material, els.stock].forEach(element => {
  element.addEventListener('input', applyFilters);
  element.addEventListener('change', applyFilters);
});

els.promoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  applyPromoCode(els.promoInput.value);
});
els.promoInput.addEventListener('input', () => {
  els.promoInput.value = els.promoInput.value.toUpperCase().replace(/\s/g, '');
});
els.promoClear.addEventListener('click', clearPromo);
els.reset.addEventListener('click', resetFilters);
els.emptyReset.addEventListener('click', resetFilters);
els.modalClose.addEventListener('click', () => els.modal.close());
els.modal.addEventListener('click', (event) => {
  if (event.target === els.modal) els.modal.close();
});

document.querySelectorAll('[data-filter-type]').forEach(button => {
  button.addEventListener('click', () => quickFilter(button.dataset.filterType, button.dataset.filterValue));
});

window.openProduct = openProduct;
loadProducts();
