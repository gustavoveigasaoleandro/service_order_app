import "reflect-metadata";

import { Sequelize } from "sequelize-typescript";

import dotenv from "dotenv";
import serviceOrder from "./serviceOrder";

dotenv.config();

const connectionInfo = {
  database: process.env.DB_NAME || "tecmed-serviceOrder",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  dialectOptions: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || "3306",
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10, // Máximo de conexões simultâneas
    min: parseInt(process.env.DB_POOL_MIN) || 0, // Mínimo de conexões
    acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 10000, // Tempo máximo em milissegundos para adquirir uma conexão
    idle: parseInt(process.env.DB_IDLE_TIMEOUT) || 3000, // Tempo que a conexão pode ficar ociosa antes de ser liberada
  },
};

export const sequelize = new Sequelize({
  dialect: "mysql",
  ...connectionInfo,
  models: [serviceOrder],
  benchmark: false,
  // for logging slow queries
  logQueryParameters: true,
  logging: (sql, timing) => {
    if (timing && timing > 200) {
      console.log(sql, timing);
    }
  },
});

export function syncModels() {
  const alter = true;

  sequelize
    .sync({
      alter,
      //disable log when Syncing
      logging: false,
      //logging: console.log
    })
    .then(() => {
      console.log("Synced db.");
    })
    .catch((err) => {
      console.log("Failed to sync db: " + err.message);
    });
}
