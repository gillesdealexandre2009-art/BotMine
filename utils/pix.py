"""Cobrança por PIX (provedor: Mercado Pago).

A Kiza cria a cobrança (QR e "copia e cola"), e o dinheiro cai direto na conta do dono no Mercado Pago. Nada de cartão e nenhum dado
bancário passa por aqui: só o valor, uma referência nossa e um e-mail genérico exigido pela API. Para saber se pagaram, a Kiza
SEMPRE consulta o pagamento na API (nunca confia no corpo de um aviso), então um aviso falso não credita nada.

Variáveis (Railway): MERCADOPAGO_ACCESS_TOKEN (obrigatória), MERCADOPAGO_API (orders, o padrão, ou payments), PUBLIC_BASE_URL (ex.: https://botmine-production-70b0.up.railway.app,
para o aviso automático; sem ela a Kiza confere os pagamentos a cada 15 s do mesmo jeito), MERCADOPAGO_WEBHOOK_SECRET (opcional,
confere a assinatura dos avisos) e PIX_EMAIL_PAGADOR (opcional).
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Protocol

import aiohttp

log = logging.getLogger("kiza.pix")

API = "https://api.mercadopago.com"
FUSO = timezone(timedelta(hours=-3))


class PixErro(Exception):
    """Falha ao falar com o provedor (a mensagem é para o log, nunca para o usuário)."""


class PixNaoConfigurado(PixErro):
    """Sem chave do provedor: o apoio por PIX fica desligado."""


@dataclass(frozen=True)
class CobrancaPix:
    id: str
    copia_cola: str
    qr_base64: str


@dataclass(frozen=True)
class PagamentoPix:
    id: str
    status: str  # pendente, aprovado, recusado, cancelado, devolvido
    valor_centavos: int
    ref: str


class ProvedorPix(Protocol):
    @property
    def configurado(self) -> bool: ...

    async def criar(self, valor_centavos: int, descricao: str, ref: str, expira_min: int) -> CobrancaPix: ...

    async def consultar(self, provedor_id: str) -> PagamentoPix: ...

    async def fechar(self) -> None: ...


_STATUS = {
    "approved": "aprovado",
    "authorized": "pendente",
    "pending": "pendente",
    "in_process": "pendente",
    "in_mediation": "pendente",
    "rejected": "recusado",
    "cancelled": "cancelado",
    "refunded": "devolvido",
    "charged_back": "devolvido",
}


def _status_order(situacao: str, detalhe: str, ordem: str) -> str:
    """Status de pedido/pagamento da API de Orders -> o nosso. Só "processed" (creditado) vale como pago."""
    s, d, o = situacao.lower(), detalhe.lower(), ordem.lower()
    if s == "processed" and d in ("accredited", ""):
        return "aprovado"
    if s in ("refunded", "partially_refunded", "charged_back") or o in ("refunded", "partially_refunded", "charged_back"):
        return "devolvido"
    if s in ("canceled", "cancelled", "expired", "failed") or o in ("canceled", "cancelled", "expired", "failed"):
        return "cancelado"
    return "pendente"


def centavos(valor: Any) -> int:
    """Valor em reais vindo da API (15.0, "15.00") para centavos, sem erro de ponto flutuante."""
    return int((float(valor) * 100) + 0.5)


def reais(valor_centavos: int) -> str:
    """1500 -> 'R$ 15,00'."""
    inteiro, resto = divmod(max(0, int(valor_centavos)), 100)
    return f"R$ {inteiro:,}".replace(",", ".") + f",{resto:02d}"


def assinatura_valida(segredo: str, x_signature: str, x_request_id: str, data_id: str) -> bool:
    """Confere o cabeçalho x-signature do Mercado Pago ("ts=...,v1=..."): HMAC-SHA256 de "id:<id>;request-id:<rid>;ts:<ts>;"."""
    try:
        partes = dict(p.strip().split("=", 1) for p in x_signature.split(",") if "=" in p)
        ts, v1 = partes["ts"], partes["v1"]
    except (KeyError, ValueError):
        return False
    manifesto = f"id:{str(data_id).lower()};request-id:{x_request_id};ts:{ts};"
    esperado = hmac.new(segredo.encode(), manifesto.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, v1)


class MercadoPago:
    """Fala com a API de Orders (a nova) e, se ela falhar ou for pedida, com a de Payments (a antiga). Quem consulta decide pelo
    formato do id: "ORD..." é pedido (Orders), só números é pagamento (Payments). Escolha a preferida com MERCADOPAGO_API=orders|payments."""

    def __init__(self, token: Optional[str] = None) -> None:
        self.token = (token if token is not None else os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")).strip()
        self.base_url = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
        self.email = os.getenv("PIX_EMAIL_PAGADOR", "").strip() or "apoio@vulpus.app"
        self.preferida = os.getenv("MERCADOPAGO_API", "orders").strip().lower()
        self._sessao: Optional[aiohttp.ClientSession] = None

    @property
    def configurado(self) -> bool:
        return bool(self.token)

    def _cabecalhos(self, extra: Optional[dict[str, str]] = None) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json", **(extra or {})}

    def _http(self) -> aiohttp.ClientSession:
        if self._sessao is None or self._sessao.closed:
            self._sessao = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20))
        return self._sessao

    async def fechar(self) -> None:
        if self._sessao is not None and not self._sessao.closed:
            await self._sessao.close()

    async def _pedir(self, metodo: str, caminho: str, rotulo: str, corpo: Optional[dict[str, Any]] = None, ref: str = "") -> Any:
        extra = {"X-Idempotency-Key": ref} if ref else None
        try:
            async with self._http().request(metodo, f"{API}{caminho}", json=corpo, headers=self._cabecalhos(extra)) as resp:
                try:
                    dados = await resp.json(content_type=None)
                except ValueError:
                    dados = (await resp.text())[:300]
                if resp.status not in (200, 201):
                    raise PixErro(f"{rotulo}: HTTP {resp.status}: {str(dados)[:300]}")
                return dados
        except aiohttp.ClientError as erro:
            raise PixErro(f"{rotulo}: {erro}") from erro

    async def criar(self, valor_centavos: int, descricao: str, ref: str, expira_min: int) -> CobrancaPix:
        if not self.configurado:
            raise PixNaoConfigurado("MERCADOPAGO_ACCESS_TOKEN não definido")
        ordem = (self._criar_orders, self._criar_payments) if self.preferida != "payments" else (self._criar_payments, self._criar_orders)
        try:
            return await ordem[0](valor_centavos, descricao, ref, expira_min)
        except PixErro as erro:
            log.warning("Primeira API do Mercado Pago falhou (%s); tentando a outra", erro)
            return await ordem[1](valor_centavos, descricao, ref, expira_min)

    async def _criar_orders(self, valor_centavos: int, descricao: str, ref: str, expira_min: int) -> CobrancaPix:
        valor = f"{valor_centavos / 100:.2f}"
        pagamento: dict[str, Any] = {
            "amount": valor,
            "payment_method": {"id": "pix", "type": "bank_transfer"},
            "expiration_time": f"PT{max(30, expira_min)}M",  # a API só aceita de 30 min a 30 dias
        }
        corpo = {
            "type": "online",
            "total_amount": valor,
            "external_reference": ref,
            "processing_mode": "automatic",
            "description": descricao[:150],
            "transactions": {"payments": [pagamento]},
            "payer": {"email": self.email},
        }
        dados = await self._pedir("POST", "/v1/orders", "criar pedido", corpo, ref)
        try:
            metodo = dados["transactions"]["payments"][0]["payment_method"]
            return CobrancaPix(str(dados["id"]), str(metodo["qr_code"]), str(metodo.get("qr_code_base64", "")))
        except (KeyError, IndexError, TypeError) as erro:
            raise PixErro(f"pedido sem os dados do PIX: {str(dados)[:300]}") from erro

    async def _criar_payments(self, valor_centavos: int, descricao: str, ref: str, expira_min: int) -> CobrancaPix:
        expira = (datetime.now(FUSO) + timedelta(minutes=expira_min)).strftime("%Y-%m-%dT%H:%M:%S.000-03:00")
        corpo: dict[str, Any] = {
            "transaction_amount": round(valor_centavos / 100, 2),
            "description": descricao[:200],
            "payment_method_id": "pix",
            "payer": {"email": self.email},
            "external_reference": ref,
            "date_of_expiration": expira,
        }
        if self.base_url:
            corpo["notification_url"] = f"{self.base_url}/pix/webhook"
        dados = await self._pedir("POST", "/v1/payments", "criar cobrança", corpo, ref)
        try:
            transacao = dados["point_of_interaction"]["transaction_data"]
            return CobrancaPix(str(dados["id"]), str(transacao["qr_code"]), str(transacao.get("qr_code_base64", "")))
        except (KeyError, TypeError) as erro:
            raise PixErro(f"resposta sem os dados do PIX: {str(dados)[:300]}") from erro

    async def consultar(self, provedor_id: str) -> PagamentoPix:
        if not self.configurado:
            raise PixNaoConfigurado("MERCADOPAGO_ACCESS_TOKEN não definido")
        if str(provedor_id).upper().startswith("ORD"):
            return await self._consultar_orders(str(provedor_id))
        return await self._consultar_payments(str(provedor_id))

    async def _consultar_orders(self, provedor_id: str) -> PagamentoPix:
        dados = await self._pedir("GET", f"/v1/orders/{provedor_id}", f"consultar pedido {provedor_id}")
        try:
            pagamentos = (dados.get("transactions") or {}).get("payments") or []
            situacao = (pagamentos[0] if pagamentos else {}).get("status") or dados.get("status")
            detalhe = (pagamentos[0] if pagamentos else {}).get("status_detail") or dados.get("status_detail") or ""
            valor = (pagamentos[0] if pagamentos else {}).get("amount") or dados.get("total_amount") or 0
            return PagamentoPix(
                str(dados["id"]),
                _status_order(str(situacao or dados.get("status") or ""), str(detalhe), str(dados.get("status") or "")),
                centavos(valor),
                str(dados.get("external_reference") or ""),
            )
        except (KeyError, TypeError, ValueError) as erro:
            raise PixErro(f"pedido ilegível: {str(dados)[:300]}") from erro

    async def _consultar_payments(self, provedor_id: str) -> PagamentoPix:
        dados = await self._pedir("GET", f"/v1/payments/{provedor_id}", f"consultar {provedor_id}")
        try:
            return PagamentoPix(
                str(dados["id"]),
                _STATUS.get(str(dados.get("status")), "pendente"),
                centavos(dados.get("transaction_amount", 0)),
                str(dados.get("external_reference") or ""),
            )
        except (KeyError, TypeError, ValueError) as erro:
            raise PixErro(f"pagamento ilegível: {str(dados)[:300]}") from erro
