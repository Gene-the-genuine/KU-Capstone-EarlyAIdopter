import type { ClientResponse, OkResponse } from "@/lib/types";
import { requireCounselor } from "@/server/auth";
import { deleteClient, getClient } from "@/server/clients";
import { handleApi, json } from "@/server/http";

type Context = RouteContext<"/api/counselor/clients/[clientId]">;

/** 내담자 한 명 (회기 목록 포함) */
export const GET = handleApi(async (_request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId } = await params;
  const client = await getClient(counselor.id, clientId);
  return json<ClientResponse>({ client });
});

/** 내담자 삭제 (회기·과제·질문도 함께 삭제되고, 내담자 링크도 바로 막힘) */
export const DELETE = handleApi(async (_request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId } = await params;
  await deleteClient(counselor.id, clientId);
  return json<OkResponse>({ ok: true });
});
