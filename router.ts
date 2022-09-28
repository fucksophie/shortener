import { client, Context, isValidHttpUrl, proxyCheck, Router, Shortened, shortenRatelimit, Status } from "./deps.ts";

export const api = new Router()
// deno-lint-ignore no-explicit-any
export async function renderShort(context: Context<Record<string, any>, Record<string, any>>) {
    const id = context.request.url.pathname.substring(1);

    const rp = await client.queryObject(`SELECT * FROM urls WHERE shorturl = $URL LIMIT 1`, {url: id});
  
    if(rp.rowCount !== 0) {
      const short = rp.rows[0] as Shortened;
      short.visitcount += 1;
  
      await client.queryObject(`UPDATE urls SET visitcount = $COUNT WHERE shorturl = $URL`, {url: id, count: short.visitcount})
  
      context.response.redirect(short.url);
    } else { 
      context.response.status = Status.NotFound
      context.response.body = `"${id}" not found`
    }
}

api.post('/api/v1/shorten', async (ctx, next) => {
  const json = await ctx.request.body().value; 
  let short = "";
  
  if(await shortenRatelimit.isRatelimited(ctx.request.ip)) {
    ctx.response.status = Status.TooManyRequests;
    ctx.response.body = {
      message: "Ratelimited! Wait a small amount of time."
    };
    return;
  }

  if(await proxyCheck(ctx.request.ip)) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = {
      message: "VPN/Proxy."
    };
    await next();
    return;
  }

  if(json?.short) {
    if (
      typeof json.short !== "string"
    ) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        message: "Short is not a string!"
      };
      await next();
    }    

    if(json.short.match(/^[a-zA-Z0-9-_]{3,50}$/gm)) {
      const maybeExists = await client.queryObject(`SELECT * FROM urls WHERE shorturl = $URL LIMIT 1`, {url: json.short});
      if(maybeExists.rowCount == 0) { 
        short = json.short 
      } else {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          message: "URL already exists!"
        };
        return;
      }
    } else {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        message: "[short] does not match requirements!"
      };
      return;
    }
  }

  if(!short) short = crypto.randomUUID().slice(0, 8);

  if(isValidHttpUrl(json?.url)) {
    const maybeExists = await client.queryObject(`SELECT * FROM urls WHERE url = $URL LIMIT 1`, {url: json.url});

    shortenRatelimit.ratelimitFor(ctx.request.ip, 12e4);

    if(maybeExists.rowCount !== 0) {
      const actual = maybeExists.rows[0] as Shortened;
      ctx.response.type = "application/json";
      
      ctx.response.body = {
        success: true, 
        url: actual.shorturl
      };
    } else {
      await client.queryObject(`INSERT INTO urls VALUES ($SHORT, $CREATEDBY, to_timestamp(${Date.now()} / 1000.0), 0, $URL)`, {
        short,
        createdBy: ctx.request.ip, // TODO: probably hash ips
        url: json.url.trim()
      })
      ctx.response.type = "application/json";
      ctx.response.body = {
        success: true, 
        url: short
      };
    }
  } else {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = {
      message: "Invalid HTTP Url!"
    };
  }
})
