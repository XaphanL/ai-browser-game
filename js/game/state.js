import { BALANCE, MODULES, ROUTE } from "./data.js";

export function createGame() {
  return {
    fuel: BALANCE.startingFuel,
    fuelCapacity: BALANCE.startingFuelCapacity,
    ore: 0,
    parts: 0,
    storageCapacity: BALANCE.startingStorageCapacity,
    productionParts: BALANCE.productionParts,
    location: { name: ROUTE[0].name, deposit: ROUTE[0].deposit, terminal: false },
    routeIndex: 0,
    selectedRoute: 0,
    modules: [],
    status: "playing",
    message: "Выберите действие или следующую точку маршрута.",
  };
}

export function getRoutes(game) {
  return game.location.terminal ? [] : ROUTE[game.routeIndex].next;
}

export function getFreeSpace(game) {
  return game.storageCapacity - game.ore - game.parts;
}

export function mine(game) {
  const amount = Math.min(game.location.deposit, getFreeSpace(game));
  if (amount <= 0) return setMessage(game, "Добыча невозможна: месторождение пусто или склад заполнен.");
  game.ore += amount;
  game.location.deposit -= amount;
  return finishAction(game, `Получено сырья: ${amount}.`);
}

export function produce(game) {
  if (game.ore < BALANCE.productionOre || game.fuel < BALANCE.productionFuel) {
    return setMessage(game, "Для производства нужно 2 сырья и 1 топливо.");
  }
  const freeAfterOre = getFreeSpace(game) + BALANCE.productionOre;
  if (freeAfterOre < game.productionParts) return setMessage(game, "На складе недостаточно места для деталей.");
  game.ore -= BALANCE.productionOre;
  game.fuel -= BALANCE.productionFuel;
  game.parts += game.productionParts;
  return finishAction(game, `Произведено деталей: ${game.productionParts}.`);
}

export function installModule(game, moduleId) {
  const module = MODULES.find((item) => item.id === moduleId);
  if (!module || game.modules.includes(moduleId)) return game;
  if (game.parts < module.cost) return setMessage(game, `Не хватает деталей: нужно ${module.cost}.`);
  game.parts -= module.cost;
  game.modules.push(moduleId);
  if (moduleId === "tank") game.fuelCapacity += 5;
  if (moduleId === "storage") game.storageCapacity += 6;
  if (moduleId === "processor") game.productionParts += 1;
  return finishAction(game, `Установлен модуль «${module.name}».`);
}

export function travel(game) {
  const destination = getRoutes(game)[game.selectedRoute];
  if (!destination) return game;
  if (game.fuel < destination.distance) return setMessage(game, "Недостаточно топлива для выбранного переезда.");
  game.fuel -= destination.distance;
  game.fuel = Math.min(game.fuelCapacity, game.fuel + BALANCE.arrivalFuel);
  game.location = { name: destination.name, deposit: destination.deposit, terminal: Boolean(destination.terminal) };
  game.routeIndex += 1;
  game.selectedRoute = 0;
  return finishAction(game, `Завод прибыл в точку «${destination.name}». Получено ${BALANCE.arrivalFuel} топлива.`);
}

export function buildFinalModule(game) {
  if (!game.location.terminal || game.parts < BALANCE.finalModuleCost) return setMessage(game, "Для финального модуля нужно 12 деталей.");
  game.parts -= BALANCE.finalModuleCost;
  game.status = "won";
  game.message = "Финальный модуль построен.";
  return game;
}

export function selectRoute(game, index) {
  const route = getRoutes(game)[index];
  if (!route) return game;
  game.selectedRoute = index;
  game.message = `Выбрана точка «${route.name}».`;
  return game;
}

function finishAction(game, message) {
  game.message = message;
  checkDefeat(game);
  return game;
}

function setMessage(game, message) {
  game.message = message;
  return game;
}

function checkDefeat(game) {
  if (game.status !== "playing" || game.location.terminal) return;
  const canProduce = game.fuel >= BALANCE.productionFuel && game.ore >= BALANCE.productionOre;
  const canTravel = getRoutes(game).some((route) => route.distance <= game.fuel);
  if (!canProduce && !canTravel) game.status = "lost";
}
