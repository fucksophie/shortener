import { Application } from "./deps.ts";
import { api, renderShort } from "./router.ts";

const app = new Application()

app.proxy = true;
app.use(api.routes())
app.use(api.allowedMethods())

app.use(async (context, next) => {
    const root = `${Deno.cwd()}/static`
    try {
      await context.send({ root, index: "index.html" })
    } catch {
      await next()  
    }
})

app.use(renderShort)

app.addEventListener("listen", ({ port }) => console.log(`Started! ${port}`) )

await app.listen({ 
  port: +(Deno.env.get("PORT") || 8080)
})
