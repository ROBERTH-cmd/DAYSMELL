
const WA_NUMBER = '573202793280';
// ─── ESTADO DEL CHAT ───
let waOpen = false;
let waStep = 0;
let waOrder = {};
let waTypingTimer = null;

// ─── FLUJO DE PREGUNTAS ───
// Cada paso: { key, question, type, options? }
const WA_FLOW = [
  {
    key: null,
    question: '¡Hola! 👋 Bienvenido a *Daysmell*.\n¿En qué puedo ayudarte hoy?',
    type: 'options',
    options: ['🛒 Hacer un pedido', '📦 Estado de mi pedido', '❓ Otra consulta']
  },
  {
    key: 'intent',
    question: null, // se resuelve según opción
    type: 'branch'
  }
];

// Flujo para PEDIDO
const FLOW_ORDER = [
  { key: 'nombre',    question: '¿Cuál es tu *nombre completo*?',                          type: 'text' },
  { key: 'telefono',  question: '¿Cuál es tu *número de teléfono* para contactarte?',      type: 'text' },
  { key: 'producto',  question: '¿Qué producto(s) deseas pedir?\n_(Escribe el nombre o referencia)_', type: 'text' },
  { key: 'talla',     question: '¿Qué *talla* necesitas? _(Si aplica, escribe "No aplica" si no)_', type: 'text' },
  { key: 'cantidad',  question: '¿Cuántas *unidades* deseas?',                             type: 'text' },
  { key: 'direccion', question: '¿Cuál es tu *dirección de entrega*?\n_(Calle, barrio, ciudad, departamento)_', type: 'text' },
  { key: 'pago',      question: '¿Cuál es tu *método de pago* preferido?',                type: 'options',
    options: ['💳 Tarjeta crédito/débito', '🏦 Transferencia bancaria', '💵 Efectivo contraentrega', '📱 Nequi / Daviplata'] },
  { key: 'notas',     question: '¿Alguna *nota especial* para tu pedido? _(Escribe "Ninguna" si no tienes)_', type: 'text' }
];

// Flujo para ESTADO DE PEDIDO
const FLOW_STATUS = [
  { key: 'nombre',    question: '¿Cuál es tu *nombre*?',                  type: 'text' },
  { key: 'telefono',  question: '¿Cuál es tu *número de pedido o teléfono* con el que realizaste la compra?', type: 'text' }
];

// Flujo para CONSULTA
const FLOW_QUERY = [
  { key: 'nombre',   question: '¿Cuál es tu *nombre*?',      type: 'text' },
  { key: 'consulta', question: '¿Cuál es tu *consulta*? Cuéntame con detalle.', type: 'text' }
];

let activeFlow = [];
let activeFlowStep = 0;

// ─── ABRIR / CERRAR ───
function openWAChat() {
  waOpen = true;
  document.getElementById('wa-widget').classList.add('open');
  document.getElementById('wa-overlay').classList.add('active');
  document.querySelector('.wa-pulse')?.remove();

  if (waStep === 0) {
    setTimeout(() => startFlow(), 400);
    waStep = 1;
  }
}

function closeWAChat() {
  waOpen = false;
  document.getElementById('wa-widget').classList.remove('open');
  document.getElementById('wa-overlay').classList.remove('active');
}

// ─── INICIO DEL FLUJO ───
function startFlow() {
  waOrder = { fecha: new Date().toLocaleString('es-CO'), tipo: '' };
  activeFlow = [];
  activeFlowStep = 0;

  botTyping(1200, () => {
    addBotMsg('¡Hola! 👋 Bienvenido a *Daysmell*.\n¿En qué puedo ayudarte hoy?');
    showOptions(['🛒 Hacer un pedido', '📦 Estado de mi pedido', '❓ Otra consulta']);
  });
}

function handleOptionSelect(option) {
  addUserMsg(option);
  hideOptions();

  if (option.includes('Hacer un pedido')) {
    waOrder.tipo = 'Pedido';
    activeFlow = [...FLOW_ORDER];
    botTyping(800, () => {
      addBotMsg('¡Perfecto! 🛍️ Voy a ayudarte con tu pedido.\nPor favor responde algunas preguntas:');
      setTimeout(() => askNext(), 600);
    });
  } else if (option.includes('Estado de mi pedido')) {
    waOrder.tipo = 'Consulta Estado';
    activeFlow = [...FLOW_STATUS];
    botTyping(800, () => {
      addBotMsg('Entendido 🔍 Voy a buscar la información de tu pedido.');
      setTimeout(() => askNext(), 600);
    });
  } else {
    waOrder.tipo = 'Consulta General';
    activeFlow = [...FLOW_QUERY];
    botTyping(800, () => {
      addBotMsg('Con gusto te ayudo 😊 Por favor cuéntame:');
      setTimeout(() => askNext(), 600);
    });
  }
}

// ─── SIGUIENTE PREGUNTA ───
function askNext() {
  if (activeFlowStep >= activeFlow.length) {
    finishFlow();
    return;
  }

  const step = activeFlow[activeFlowStep];
  showInputBar();

  botTyping(700, () => {
    const msg = step.question.replace(/\*(.*?)\*/g, '<b>$1</b>').replace(/_(.*?)_/g, '<i>$1</i>');
    addBotMsgHTML(msg);

    if (step.type === 'options') {
      hideInputBar();
      showOptions(step.options);
    }
  });
}

// ─── ENVIAR MENSAJE USUARIO ───
function sendWAMessage() {
  const input = document.getElementById('wa-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addUserMsg(text);
  processUserInput(text);
}

function processUserInput(text) {
  if (activeFlowStep >= activeFlow.length) return;

  const step = activeFlow[activeFlowStep];
  waOrder[step.key] = text;
  activeFlowStep++;

  setTimeout(() => askNext(), 500);
}

function processOptionInput(option) {
  if (activeFlowStep >= activeFlow.length) return;

  const step = activeFlow[activeFlowStep];
  waOrder[step.key] = option.replace(/^[^\w]+/, '').trim(); // quitar emoji prefijo
  activeFlowStep++;
  hideOptions();

  setTimeout(() => askNext(), 500);
}

// ─── FINALIZAR FLUJO ───
function finishFlow() {
  hideInputBar();
  hideOptions();

  const orderNum = 'DS-' + Date.now().toString().slice(-6);
  waOrder.numero_pedido = orderNum;

  // Guardar en localStorage
  saveOrderToStorage(waOrder);

  botTyping(1000, () => {
    if (waOrder.tipo === 'Pedido') {
      addBotMsgHTML(`
        <div class="wa-success-card">
          <strong>✅ ¡Pedido registrado!</strong>
          Número de orden: <b>${orderNum}</b><br>
          En breve nos comunicamos contigo. 🛍️
        </div>
      `);

      setTimeout(() => {
        botTyping(800, () => {
          addBotMsg(`También puedes escribirnos directamente por WhatsApp para confirmar tu pedido:`);
          setTimeout(() => {
            const waMsg = buildWAMessage(waOrder);
            addBotMsgHTML(`
              <a href="${waMsg}" target="_blank" 
                 style="display:inline-flex;align-items:center;gap:.5rem;background:#25d366;color:#fff;padding:.6rem 1rem;border-radius:20px;font-size:.82rem;font-weight:700;text-decoration:none;margin-top:.3rem">
                <i class="fab fa-whatsapp"></i> Confirmar en WhatsApp
              </a>
            `);
            showRestartOption();
          }, 600);
        });
      }, 800);

    } else if (waOrder.tipo === 'Consulta Estado') {
      addBotMsg(`Gracias ${waOrder.nombre || ''} 🙌\nBuscaremos tu pedido y te contactaremos al número que nos diste.`);
      setTimeout(() => {
        const waMsg = buildWAMessage(waOrder);
        addBotMsgHTML(`
          <a href="${waMsg}" target="_blank"
             style="display:inline-flex;align-items:center;gap:.5rem;background:#25d366;color:#fff;padding:.6rem 1rem;border-radius:20px;font-size:.82rem;font-weight:700;text-decoration:none">
            <i class="fab fa-whatsapp"></i> Hablar con un agente
          </a>
        `);
        showRestartOption();
      }, 500);

    } else {
      addBotMsg(`¡Gracias por tu mensaje ${waOrder.nombre || ''}! 📩\nUn asesor te responderá pronto.`);
      setTimeout(() => {
        const waMsg = buildWAMessage(waOrder);
        addBotMsgHTML(`
          <a href="${waMsg}" target="_blank"
             style="display:inline-flex;align-items:center;gap:.5rem;background:#25d366;color:#fff;padding:.6rem 1rem;border-radius:20px;font-size:.82rem;font-weight:700;text-decoration:none">
            <i class="fab fa-whatsapp"></i> Enviar por WhatsApp
          </a>
        `);
        showRestartOption();
      }, 500);
    }
  });
}

function showRestartOption() {
  setTimeout(() => {
    showOptions(['🔄 Nueva consulta', '❌ Cerrar chat']);
  }, 700);
}

// ─── CONSTRUIR MENSAJE WHATSAPP ───
function buildWAMessage(order) {
  let text = '';
  if (order.tipo === 'Pedido') {
    text = `*NUEVO PEDIDO - Daysmell* 🛍️\n\n`;
    text += `📋 *N° Orden:* ${order.numero_pedido || '-'}\n`;
    text += `👤 *Cliente:* ${order.nombre || '-'}\n`;
    text += `📞 *Teléfono:* ${order.telefono || '-'}\n`;
    text += `🛒 *Producto:* ${order.producto || '-'}\n`;
    text += `📐 *Talla:* ${order.talla || '-'}\n`;
    text += `🔢 *Cantidad:* ${order.cantidad || '-'}\n`;
    text += `📍 *Dirección:* ${order.direccion || '-'}\n`;
    text += `💳 *Pago:* ${order.pago || '-'}\n`;
    text += `📝 *Notas:* ${order.notas || '-'}\n`;
    text += `🕐 *Fecha:* ${order.fecha || '-'}`;
  } else if (order.tipo === 'Consulta Estado') {
    text = `*CONSULTA DE PEDIDO - Daysmell*\n\n`;
    text += `👤 *Nombre:* ${order.nombre || '-'}\n`;
    text += `📞 *Teléfono/Pedido:* ${order.telefono || '-'}\n`;
    text += `🕐 *Fecha consulta:* ${order.fecha || '-'}`;
  } else {
    text = `*CONSULTA - Daysmell*\n\n`;
    text += `👤 *Nombre:* ${order.nombre || '-'}\n`;
    text += `💬 *Consulta:* ${order.consulta || '-'}\n`;
    text += `🕐 *Fecha:* ${order.fecha || '-'}`;
  }

  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

// ─── GUARDAR PEDIDO EN LOCALSTORAGE ───
function saveOrderToStorage(order) {
  try {
    const orders = JSON.parse(localStorage.getItem('daysmell_orders') || '[]');
    orders.unshift({ ...order, id: Date.now() });
    localStorage.setItem('daysmell_orders', JSON.stringify(orders));
  } catch (e) {
    console.error('Error guardando pedido:', e);
  }
}

// ─── UI HELPERS ───
function addBotMsg(text) {
  const el = document.createElement('div');
  el.className = 'wa-bubble bot';
  // Formato básico: **bold**, _italic_
  el.innerHTML = text
    .replace(/\*(.*?)\*/g, '<b>$1</b>')
    .replace(/_(.*?)_/g, '<i>$1</i>')
    .replace(/\n/g, '<br>') +
    `<span class="wa-time">${nowTime()}</span>`;
  appendMsg(el);
}

function addBotMsgHTML(html) {
  const el = document.createElement('div');
  el.className = 'wa-bubble bot';
  el.innerHTML = html + `<span class="wa-time">${nowTime()}</span>`;
  appendMsg(el);
}

function addUserMsg(text) {
  const el = document.createElement('div');
  el.className = 'wa-bubble user';
  el.innerHTML = escapeHtml(text) + `<span class="wa-time">${nowTime()} ✓✓</span>`;
  appendMsg(el);
}

function appendMsg(el) {
  const container = document.getElementById('wa-messages');
  // Quitar typing indicator si existe
  const typing = container.querySelector('.wa-typing');
  if (typing) typing.remove();
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function botTyping(duration, callback) {
  const container = document.getElementById('wa-messages');
  const el = document.createElement('div');
  el.className = 'wa-typing';
  el.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  setTimeout(() => {
    el.remove();
    callback();
  }, duration);
}

function showOptions(opts) {
  const container = document.getElementById('wa-options');
  container.innerHTML = opts.map(o =>
    `<button class="wa-option-btn" onclick="onOptionClick('${escapeHtml(o)}')">${o}</button>`
  ).join('');
  hideInputBar();
}

function onOptionClick(option) {
  if (activeFlow.length === 0) {
    handleOptionSelect(option);
  } else if (option === '🔄 Nueva consulta') {
    hideOptions();
    clearMessages();
    waStep = 0;
    startFlow();
  } else if (option === '❌ Cerrar chat') {
    closeWAChat();
    hideOptions();
  } else {
    processOptionInput(option);
  }
}

function hideOptions() {
  document.getElementById('wa-options').innerHTML = '';
}

function showInputBar() {
  document.getElementById('wa-input-area').style.display = 'flex';
  setTimeout(() => document.getElementById('wa-input')?.focus(), 100);
}

function hideInputBar() {
  document.getElementById('wa-input-area').style.display = 'none';
}

function clearMessages() {
  document.getElementById('wa-messages').innerHTML = '';
}

function nowTime() {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
