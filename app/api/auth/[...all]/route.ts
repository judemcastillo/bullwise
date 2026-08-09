import { getAuth } from "@/lib/better-auth/auth";

const handler = async (request: Request) => (await getAuth()).handler(request);

export { handler as GET, handler as POST };
