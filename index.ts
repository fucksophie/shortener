
import { Application, Router, Status } from "https://deno.land/x/oak@v10.4.0/mod.ts"

const port = 8080

const app = new Application()
const router = new Router()

// error handler
app.use(async (_ctx, next) => {
  try {
    await next()
  } catch (err) {
    console.log(err)
  }
})

router.post('/api/v1/shorten', ctx => {
  ctx.response.type = "application/json";
  ctx.response.body = {success: true, url: "12048AJnmtmn"};
  /*
  ctx.response.body = {success: true, url: "12048AJnmtmn"};
    ctx.response.body = {success: false};
    ctx.response.body = {message: "died"};

  */
})

app.use(router.routes())
app.use(router.allowedMethods())

// static content
app.use(async (context, next) => {
    const root = `${Deno.cwd()}/static`
    try {
        await context.send({ root, index: "index.html" })
    } catch {
        next()
    }
})

// page not found
app.use(context => {
  context.response.status = Status.NotFound
  context.response.body = `"${context.request.url.pathname}" not found`
})

app.addEventListener("listen", ({ port }) => console.log(`listening on port: ${port}`) )

await app.listen({ port })
