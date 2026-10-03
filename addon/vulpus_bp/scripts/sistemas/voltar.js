// @ts-check
// Voltar: o último lugar salvo (onde morreu ou de onde saiu no último teleporte).
import { Player, world } from "@minecraft/server";
import { registrarComando } from "../core/comandos.js";
import { dadosJogador, editarJogador } from "../core/db.js";
import { localDe, teleportar } from "../core/teleporte.js";
import { erro, msg, registrarErro } from "../core/util.js";
import * as textos from "../textos/voltar.js";

/**
 * Teleporta para o local de "Voltar". O destino é lido na hora de chegar (pode mudar na espera).
 * @param {Player} player
 */
export function irVoltar(player) {
  if (!dadosJogador(player).voltar) {
    erro(player, textos.SEM_LOCAL);
    return;
  }
  teleportar(player, () => dadosJogador(player).voltar ?? undefined, { nome: textos.DESTINO });
}

registrarComando({ nome: "voltar", descricao: textos.CMD_VOLTAR }, (p) => irVoltar(p));

// Morte: guarda o local (menos no vazio, que mataria de novo) e conta a morte.
world.afterEvents.entityDie.subscribe(
  ({ deadEntity }) => {
    if (!(deadEntity instanceof Player) || !deadEntity.isValid) return;
    try {
      const local = localDe(deadEntity);
      const noVazio = local.y < deadEntity.dimension.heightRange.min;
      editarJogador(deadEntity, (dados) => {
        dados.mortes++;
        if (!noVazio) dados.voltar = local;
      });
      if (!noVazio) msg(deadEntity, textos.DICA_MORTE);
    } catch (e) {
      registrarErro("Morte do jogador", e);
    }
  },
  { entityTypes: ["minecraft:player"] },
);
