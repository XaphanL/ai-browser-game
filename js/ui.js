import { BALANCE, MODULES, ROUTE } from "./game/data.js";
import { getFreeSpace, getRoutes } from "./game/state.js";

const byId = (id) => document.getElementById(id);

export function createUI(actions) {
  byId("mine-button").addEventListener("click", actions.mine);
  byId("produce-button").addEventListener("click", actions.produce);
  byId("restart-button").addEventListener("click", actions.restart);
  byId("overlay-restart").addEventListener("click", actions.restart);
  return { render: (game) => render(game, actions) };
}

function render(game, actions) {
  const freeSpace = getFreeSpace(game);
  setResource("fuel", game.fuel, game.fuelCapacity);
  setResource("ore", game.ore, game.storageCapacity);
  setResource("parts", game.parts, game.storageCapacity);
  byId("space-value").textContent = `${freeSpace} / ${game.storageCapacity}`;
  byId("location-name").textContent = game.location.name;
  byId("route-step").textContent = game.location.terminal ? "Финиш" : `Участок ${game.routeIndex + 1} / ${ROUTE.length}`;
  byId("deposit-value").textContent = `${game.location.deposit} ед.`;
  byId("notice").textContent = game.message;

  const mineAmount = Math.min(game.location.deposit, freeSpace);
  byId("mine-description").textContent = `Получить до ${mineAmount} сырья, пока есть место.`;
  byId("mine-button").disabled = mineAmount <= 0 || game.status !== "playing";
  const fuelAfterProduction = game.fuel - BALANCE.productionFuel;
  const oreAfterProduction = game.ore - BALANCE.productionOre;
  const canActAfterProduction = game.location.terminal
    || (fuelAfterProduction >= BALANCE.productionFuel && oreAfterProduction >= BALANCE.productionOre)
    || getRoutes(game).some((route) => route.distance <= fuelAfterProduction);
  const productionWarning = canActAfterProduction ? "" : " Внимание: после этого завод остановится.";
  byId("produce-description").textContent = `2 сырья + 1 топливо → ${game.productionParts} детали.${productionWarning}`;
  byId("produce-button").disabled = game.ore < 2 || game.fuel < 1 || freeSpace + 2 < game.productionParts || game.status !== "playing";

  renderRoutes(game, actions);
  renderModules(game, actions);
  renderFactory(game);
  renderFinalModule(game, actions);
  renderOverlay(game);
}

function setResource(name, value, maximum) {
  byId(`${name}-value`).textContent = `${value} / ${maximum}`;
  byId(`${name}-meter`).style.width = `${Math.min(100, value / maximum * 100)}%`;
}

function renderRoutes(game, actions) {
  const container = byId("route-options");
  container.replaceChildren();
  const routes = getRoutes(game);
  if (!routes.length) {
    const message = document.createElement("p");
    message.className = "notice";
    message.textContent = "Маршрут завершён. Соберите детали для финального модуля.";
    container.append(message);
    return;
  }
  routes.forEach((route, index) => {
    const button = document.createElement("button");
    button.className = "route-card";
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === game.selectedRoute));
    button.innerHTML = `<strong>${route.name}</strong><span>${route.distance} топлива · ${route.deposit} сырья</span>`;
    button.addEventListener("click", () => actions.selectRoute(index));
    container.append(button);
  });
  const selected = routes[game.selectedRoute];
  const travel = document.createElement("button");
  travel.className = "button travel-button";
  travel.type = "button";
  travel.textContent = `Ехать: −${selected.distance} топлива`;
  travel.disabled = game.fuel < selected.distance || game.status !== "playing";
  travel.title = travel.disabled ? "Недостаточно топлива" : `По прибытии бак пополнится на ${BALANCE.arrivalFuel}`;
  travel.addEventListener("click", actions.travel);
  container.append(travel);
}

function renderModules(game, actions) {
  const container = byId("module-list");
  container.replaceChildren();
  MODULES.forEach((item) => {
    const installed = game.modules.includes(item.id);
    const element = document.createElement("article");
    element.className = `module${installed ? " module--installed" : ""}`;
    const name = document.createElement("strong");
    name.textContent = item.name;
    const description = document.createElement("p");
    description.textContent = item.description;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = installed ? "Готово" : `${item.cost} дет.`;
    button.disabled = installed || game.parts < item.cost || game.status !== "playing";
    if (!installed) button.addEventListener("click", () => actions.installModule(item.id));
    element.append(name, description, button);
    container.append(element);
  });
}

function renderFactory(game) {
  const slots = byId("factory-slots");
  slots.replaceChildren(...game.modules.map(() => document.createElement("i")));
}

function renderFinalModule(game, actions) {
  const container = byId("final-module");
  container.hidden = !game.location.terminal;
  if (container.hidden) return;
  container.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "Финальный модуль";
  const description = document.createElement("p");
  description.textContent = `Условие победы · ${BALANCE.finalModuleCost} деталей`;
  const button = document.createElement("button");
  button.className = "button";
  button.type = "button";
  button.textContent = "Построить";
  button.disabled = game.parts < BALANCE.finalModuleCost || game.status !== "playing";
  button.addEventListener("click", actions.buildFinalModule);
  container.append(title, description, button);
}

function renderOverlay(game) {
  const overlay = byId("game-overlay");
  overlay.hidden = game.status === "playing";
  if (overlay.hidden) return;
  const won = game.status === "won";
  byId("overlay-label").textContent = won ? "Маршрут завершён" : "Завод остановлен";
  byId("overlay-title").textContent = won ? "Финальный модуль построен" : "Топливо закончилось";
  byId("overlay-text").textContent = won
    ? "Передвижной завод достиг конечной точки и завершил модернизацию."
    : "Топлива не хватает ни для производства, ни для переезда к доступной точке.";
}
