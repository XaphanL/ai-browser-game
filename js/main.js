import {
  buildFinalModule,
  createGame,
  installModule,
  mine,
  produce,
  selectRoute,
  travel,
} from "./game/state.js";
import { createUI } from "./ui.js";

let game = createGame();
let ui;

function act(operation, ...args) {
  operation(game, ...args);
  ui.render(game);
}

const actions = {
  mine: () => act(mine),
  produce: () => act(produce),
  travel: () => act(travel),
  installModule: (id) => act(installModule, id),
  selectRoute: (index) => act(selectRoute, index),
  buildFinalModule: () => act(buildFinalModule),
  restart: () => {
    game = createGame();
    ui.render(game);
  },
};

ui = createUI(actions);
ui.render(game);
