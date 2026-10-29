import { addClientSchema } from "@/lib/schemas";
import type { ClientResponse, ClientsResponse } from "@/lib/types";
import { requireCounselor } from "@/server/auth";
import { addClient, listClients } from "@/server/clients";
import { handleApi, json, readJson } from "@/server/http";

/** 내 내담자 목록 (각 내담자의 회기 목록 포함) */
export const GET = handleApi(async () => {
  const counselor = await requireCounselor();
  const clients = await listClients(counselor.id);
  return json<ClientsResponse>({ clients });
});

/** 내담자 추가 */
export const POST = handleApi(async (request) => {
  const counselor = await requireCounselor();
  const input = await readJson(request, addClientSchema);
  const client = await addClient(counselor.id, input);
  return json<ClientResponse>({ client }, 201);
});
