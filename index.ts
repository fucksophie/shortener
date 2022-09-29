import { Application, Router } from "./deps.ts";
import { api, renderShort } from "./router.ts";

const app = new Application()

app.proxy = true;

app.use(api.routes())
app.use(api.allowedMethods())

app.addEventListener("error", (evt) => {
  console.log("experienced error [APP]: " + evt.error);
});

const shit = new Router();

shit.get("/s/:file?", async (context, next) => {
    try {
      await context.send({ root: `${Deno.cwd()}/static`, path: context.params.file || "index.html"})
    } catch {
      await next()  
    }
})

app.use(shit.routes())
app.use(shit.allowedMethods())

app.use(renderShort)

app.addEventListener("listen", ({ port }) => console.log(`Started! ${port}`) )

await app.listen({ 
  port: +(Deno.env.get("PORT") || 8080)
})
