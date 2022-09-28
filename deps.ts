import "https://deno.land/x/dotenv@v3.2.0/load.ts";

export { Application, Router, Status, Context } from "https://deno.land/x/oak@v10.4.0/mod.ts"
import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { Ratelimit } from "./Ratelimit.ts";

export const shortenRatelimit = new Ratelimit("shorten");
export const client = new Client(Deno.env.get("DATABASE_URL"));
const banned: Record<string, boolean> = {};

await shortenRatelimit.start();
await client.connect();

if (
  ((await client.queryObject(`SELECT EXISTS (
	SELECT FROM 
		pg_tables
	WHERE 
		schemaname = 'public' AND 
		tablename  = 'urls'
	);`)).rows[0] as { exists: boolean }).exists
) {
  console.log("Table exists! ✅");
} else {
  console.log("Table does not exist. Creating!");

  await client.queryObject(`CREATE TABLE urls (
      shortUrl TEXT PRIMARY KEY,
      createdBy TEXT NOT NULL,
      createdAt TIMESTAMP NOT NULL,
      visitCount INTEGER NOT NULL,
      url TEXT NOT NULL
	  );
	`);
}

export interface Shortened {
  shorturl: string,
  createdby: string,
  createdat: Date,
  visitcount: number,
  url: string
}

export async function proxyCheck(ip: string) {
  
  if(ip == "127.0.0.1") return false;

  if(banned[ip]) return banned[ip];
  const key = Deno.env.get("PROXYCHECK_KEY");
  
  const getProxycheck = await fetch(
    "https://proxycheck.io/v2/" + ip + "?vpn=1" + (key ? "&key=" + key : "")
  )
  
  const getProxycheckBody = await getProxycheck.json();
  // deno-lint-ignore no-explicit-any
  const value = (getProxycheck.status == 429 || getProxycheckBody.status == "error") ? false : (Object.entries(getProxycheckBody) as any)?.at(-1)?.at(-1)?.proxy == "yes";
  
  banned[ip] = value;

  return value;
}

export function isValidHttpUrl(str: string) {
  let url;

  try {
    url = new URL(str);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

