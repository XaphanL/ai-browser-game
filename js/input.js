export function createInput(canvas) {
  const input = { keys: new Set(), shield: false, attack: false, aimX: null, aimY: null };
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyF']);

  addEventListener('keydown', event => {
    if (movementKeys.has(event.code)) event.preventDefault();
    input.keys.add(event.code);
    if (event.code === 'Space') input.shield = true;
    if (event.code === 'KeyF') input.attack = true;
  });
  addEventListener('keyup', event => {
    input.keys.delete(event.code);
    if (event.code === 'Space') input.shield = false;
    if (event.code === 'KeyF') input.attack = false;
  });
  addEventListener('blur', () => { input.keys.clear(); input.shield = false; input.attack = false; });

  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    input.aimX = (event.clientX - rect.left) * canvas.width / rect.width;
    input.aimY = (event.clientY - rect.top) * canvas.height / rect.height;
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    if (event.button === 0) input.attack = true;
    if (event.button === 2) input.shield = true;
  });
  addEventListener('pointerup', event => {
    if (event.button === 0) input.attack = false;
    if (event.button === 2) input.shield = false;
  });

  document.querySelectorAll('[data-direction]').forEach(button => {
    const code = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[button.dataset.direction];
    const press = event => { event.preventDefault(); input.keys.add(code); };
    const release = event => { event.preventDefault(); input.keys.delete(code); };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  });

  const shieldButton = document.querySelector('#shield-button');
  const setShield = value => event => { event.preventDefault(); input.shield = value; };
  shieldButton.addEventListener('pointerdown', setShield(true));
  shieldButton.addEventListener('pointerup', setShield(false));
  shieldButton.addEventListener('pointercancel', setShield(false));

  const attackButton = document.querySelector('#attack-button');
  const setAttack = value => event => { event.preventDefault(); input.attack = value; };
  attackButton.addEventListener('pointerdown', setAttack(true));
  attackButton.addEventListener('pointerup', setAttack(false));
  attackButton.addEventListener('pointercancel', setAttack(false));
  return input;
}

export function movementVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x--;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x++;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y--;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y++;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, moving: x !== 0 || y !== 0 };
}
