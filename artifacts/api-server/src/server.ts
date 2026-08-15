import app from "./app";
import { logger } from "./lib/logger";
import { databaseReady } from "@workspace/db";

export async function startServer(port: number): Promise<ReturnType<typeof app.listen>> {
  await databaseReady;

  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err?: Error) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        reject(err);
        return;
      }

      logger.info({ port }, "Server listening");
      resolve(server);
    });

    server.once("error", reject);
  });
}