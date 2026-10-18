// @ts-check
// Ninguém descobre onde outro jogador está sem ele saber: sem mapas (que mostram jogadores), sem barra de localização
// e sem coordenadas na tela. A staff é isenta (precisa dos mapas para as obras).
import { EquipmentSlot, system, world } from "@minecraft/server";
import { ehStaff } from "../core/permissoes.js";
import { online } from "../core/jogadores.js";
import { registrarErro } from "../core/util.js";

const MAPAS = new Set(["minecraft:map", "minecraft:filled_map", "minecraft:empty_map", "minecraft:locator_map"]);
const REGRAS = ["locatorbar", "showcoordinates"];

function regras() {
  for (const r of REGRAS) {
    try {
      world.getDimension("minecraft:overworld").runCommand(`gamerule ${r} false`);
    } catch {
      // regra que esta versão não conhece: ignora
    }
  }
}

function recolherMapas() {
  for (const player of online()) {
    try {
      if (ehStaff(player)) continue;
      const inv = player.getComponent("minecraft:inventory")?.container;
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item && MAPAS.has(item.typeId)) inv.setItem(i, undefined);
        }
      }
      const eq = player.getComponent("minecraft:equippable");
      const mao = eq?.getEquipment(EquipmentSlot.Offhand);
      if (mao && MAPAS.has(mao.typeId)) eq?.setEquipment(EquipmentSlot.Offhand, undefined);
    } catch (e) {
      registrarErro("Recolher mapas", e);
    }
  }
  // mapas jogados no chão
  try {
    for (const dim of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
      for (const e of world.getDimension(dim).getEntities({ type: "minecraft:item" })) {
        const item = e.getComponent("minecraft:item")?.itemStack;
        if (item && MAPAS.has(item.typeId)) e.remove();
      }
    }
  } catch {
    // chunk sem carregar: tenta de novo no próximo passo
  }
}

system.runTimeout(regras, 60);
world.afterEvents.playerSpawn.subscribe(({ initialSpawn }) => {
  if (initialSpawn) system.runTimeout(regras, 20);
});
system.runInterval(recolherMapas, 40);
