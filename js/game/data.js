export const BALANCE = Object.freeze({
  startingFuel: 10,
  startingFuelCapacity: 10,
  startingStorageCapacity: 12,
  arrivalFuel: 6,
  productionOre: 2,
  productionFuel: 1,
  productionParts: 2,
  finalModuleCost: 12,
});

export const MODULES = Object.freeze([
  { id: "tank", name: "Увеличенный бак", cost: 4, description: "+5 к максимуму топлива" },
  { id: "storage", name: "Расширенный склад", cost: 5, description: "+6 к общему складу" },
  { id: "processor", name: "Эффективный переработчик", cost: 7, description: "+1 деталь за цикл производства" },
]);

export const ROUTE = Object.freeze([
  {
    name: "Нулевая стоянка",
    deposit: 10,
    next: [
      { name: "Железный склон", distance: 3, deposit: 9 },
      { name: "Сухой карьер", distance: 5, deposit: 14 },
    ],
  },
  {
    next: [
      { name: "Ржавая гряда", distance: 3, deposit: 10 },
      { name: "Глубокий пласт", distance: 5, deposit: 15 },
    ],
  },
  {
    next: [
      { name: "Северный разрез", distance: 4, deposit: 12 },
      { name: "Богатая жила", distance: 6, deposit: 18 },
    ],
  },
  {
    next: [
      { name: "Предельная шахта", distance: 3, deposit: 11 },
      { name: "Дальний уступ", distance: 5, deposit: 17 },
    ],
  },
  {
    next: [
      { name: "Конечная точка", distance: 4, deposit: 14, terminal: true },
      { name: "Конечный разрез", distance: 6, deposit: 20, terminal: true },
    ],
  },
]);
