import { client } from "./deps.ts";

export class Ratelimit {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async isRatelimited(key: string) {
    if (await this.getRatelimit(key) < Date.now()) {
      await client.queryObject(
        `DELETE FROM ${this.name}_ratelimit WHERE ip = $key`,
        {
          key,
        },
      );
      return false;
    } else {
      return true;
    }
  }

  async getRatelimit(key: string): Promise<number> {
    const ratelimit = await client.queryObject(
      `SELECT ms FROM ${this.name}_ratelimit WHERE ip = $KEY`,
      {
        key,
      },
    );

    if (ratelimit.rows.length >= 1) {
      return new Date((ratelimit.rows[0] as { ms: number }).ms).getTime();
    } else {
      return 0;
    }
  }
  async ratelimitFor(key: string, time = 60000 * 2) {
    const date = new Date(Date.now() + time);

    await client.queryObject(
      `INSERT INTO ${this.name}_ratelimit VALUES ($KEY, $TIME)`,
      {
        key,
        time: `${date.getFullYear()}-${
          date.getMonth() + 1
        }-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`,
      },
    );
  }
  async start() {
    if (
      ((await client.queryObject(`SELECT EXISTS (
              SELECT FROM 
                  pg_tables
              WHERE 
                  schemaname = 'public' AND 
                  tablename  = '${this.name}_ratelimit'
              );`)).rows[0] as { exists: boolean }).exists
    ) {
      console.log("Ratelimit table " + this.name + " already exists!");
    } else {
      await client.queryObject(`CREATE TABLE ${this.name}_ratelimit (
        ip TEXT PRIMARY KEY,
        ms TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);

      console.log("Ratelimit table " + this.name + " has been created!");
    }
  }
}