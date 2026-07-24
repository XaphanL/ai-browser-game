const ROOM_TYPES = { arena: 'Арена', merchant: 'Торговец', boss: 'Босс' };
const OBJECTIVES = { clear: 'зачистка', crystals: 'кристаллы', capture: 'захват', survive: 'выживание', hunt: 'охота' };

export function createAdminMenu({ getRun, teleport, openUpgradeShop, openMerchantShop, restorePlayer, completeRoom, resetRoom }) {
  const menu = document.querySelector('#admin-menu');
  const toggle = document.querySelector('#admin-toggle');
  const roomSelect = document.querySelector('#admin-room');
  const feedback = document.querySelector('#admin-feedback');

  function renderRooms() {
    const run = getRun();
    const rooms = [...run.maze.rooms.values()].sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    roomSelect.replaceChildren(...rooms.map(room => {
      const option = document.createElement('option');
      option.value = room.id;
      const detail = room.type === 'arena' ? ` · ${OBJECTIVES[room.objective]}` : '';
      option.textContent = `${String(room.distance + 1).padStart(2, '0')} · ${ROOM_TYPES[room.type]}${detail} · ${room.difficulty} [${room.id}]`;
      return option;
    }));
    roomSelect.value = run.currentRoomId;
  }

  function setOpen(value) {
    menu.hidden = !value;
    toggle.setAttribute('aria-expanded', String(value));
    if (value) { renderRooms(); feedback.textContent = 'Игра приостановлена'; }
  }

  function runAction(action) {
    const run = getRun();
    if (action === 'room') teleport(roomSelect.value);
    if (action === 'boss') teleport(run.maze.bossId);
    if (action === 'merchant' && run.maze.merchantId) teleport(run.maze.merchantId);
    if (action === 'shop') { setOpen(false); openUpgradeShop(); return; }
    if (action === 'merchant-shop') { setOpen(false); openMerchantShop(); return; }
    if (action === 'score') run.score += 500;
    if (action === 'restore') restorePlayer();
    if (action === 'complete') completeRoom();
    if (action === 'reset-room') resetRoom();
    renderRooms();
    feedback.textContent = action === 'score' ? `Баланс: ${run.score} очков` : 'Команда выполнена';
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  document.querySelector('#admin-close').addEventListener('click', () => setOpen(false));
  menu.addEventListener('click', event => {
    const action = event.target.closest('[data-admin-action]')?.dataset.adminAction;
    if (action) runAction(action);
  });
  addEventListener('keydown', event => {
    if (event.code === 'Backquote') { event.preventDefault(); setOpen(menu.hidden); }
    if (event.code === 'Escape' && !menu.hidden) setOpen(false);
  });

  return { isOpen: () => !menu.hidden, close: () => setOpen(false) };
}
