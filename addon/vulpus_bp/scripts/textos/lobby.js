// @ts-check
// Textos da proteção do lobby.

export const CMD_DEFINIRLOBBY = "Marca o lobby protegido onde você está, com o raio em blocos (staff)";
export const CMD_RAIOLOBBY = "Muda o raio de proteção do lobby, em blocos (staff)";
export const CMD_REMOVERLOBBY = "Remove a proteção do lobby (staff)";

/**
 * @param {string} coords
 * @param {number} raio
 */
export const LOBBY_DEFINIDO = (coords, raio) =>
  `§aLobby protegido em §e${coords}§a, raio de §e${raio}§a blocos. A staff continua livre para construir.`;
/** @param {number} raio */
export const RAIO_DEFINIDO = (raio) => `§aRaio do lobby agora é de §e${raio}§a blocos.`;
export const LOBBY_REMOVIDO = "§aProteção do lobby removida.";
export const SEM_LOBBY = "Ainda não existe lobby marcado. Use /vulpus:definirlobby no meio dele.";
export const PROTEGIDO = "§cO lobby é protegido: aqui ninguém constrói nem quebra.";

// Painel da staff (lobby, portal de saída e RTP)
export const TITULO_STAFF = "Lobby e portal (staff)";
export const BOTAO_STAFF = "Lobby e portal";
export const SECAO_LOBBY = "LOBBY PROTEGIDO";
export const SECAO_PORTAL = "PORTAL DE SAÍDA";
export const SECAO_RTP = "RTP E BARREIRA";
export const BOTAO_MARCAR_LOBBY = "Marcar o lobby aqui";
export const BOTAO_RAIO_LOBBY = "Ajustar o raio do lobby";
export const BOTAO_VER_LIMITE = "Mostrar o limite do lobby";
export const BOTAO_REMOVER_LOBBY = "Remover a proteção do lobby";
export const BOTAO_MARCAR_PORTAL = "Marcar o portal aqui";
export const BOTAO_RAIO_PORTAL = "Ajustar o raio do portal";
export const BOTAO_REMOVER_PORTAL = "Remover o portal";
export const BOTAO_CONFIG_RTP = "Distâncias, altura e barreira";
export const ROTULO_RAIO = "Raio (blocos)";
export const CONFIRMAR_LOBBY = "Remover a proteção do lobby? Todo mundo poderá construir lá.";
export const CONFIRMAR_PORTAL = "Remover o portal de saída, o letreiro e o texto flutuante?";
/**
 * @param {{ x: number, y: number, z: number, r: number } | undefined} lobby
 * @param {{ x: number, y: number, z: number, r: number } | undefined} portal
 */
export const CORPO_STAFF = (lobby, portal) =>
  [
    "§7Proteção contra construir, quebrar, briga e bichos, e o portal que leva ao mundo aberto.",
    "",
    lobby ? `§fLobby: §a${Math.round(lobby.x)}, ${Math.round(lobby.y)}, ${Math.round(lobby.z)} §7(raio ${lobby.r})` : "§fLobby: §cnão marcado",
    portal ? `§fPortal: §a${Math.round(portal.x)}, ${Math.round(portal.y)}, ${Math.round(portal.z)} §7(raio ${portal.r})` : "§fPortal: §cnão marcado",
  ].join("\n");
