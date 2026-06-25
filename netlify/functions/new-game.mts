import { pickCategories } from "../../server/pickCategories";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const groups = Number(url.searchParams.get("groups"));
  const wordsPerGroup = Number(url.searchParams.get("words"));

  if (!Number.isFinite(groups) || !Number.isFinite(wordsPerGroup)) {
    return Response.json({ error: "groups and words must be numbers" }, { status: 400 });
  }

  const categories = pickCategories(groups, wordsPerGroup);
  return Response.json({ categories }, { headers: { "Cache-Control": "no-store" } });
};
