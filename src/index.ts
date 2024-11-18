import express, { NextFunction, Request, Response } from "express";
import { syncModels } from "./app/models/index.js";
import routes from "./app/routes/index.js";
import errorHandler from "./app/middleware/errorHandler.js";
import dotenv from "dotenv";

const app = express();
dotenv.config();
// Define a porta pelo ambiente ou usa a porta 3000 como padrão
const port = process.env.PORT || 3001;

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Origin", "*"); // Substitua pelo domínio desejado
  res.header("Access-Control-Allow-Methods", "OPTIONS, POST, GET, PUT, DELETE");

  // Permitir o preflight CORS (método OPTIONS)
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Middleware para log de CORS (para debug)
app.use((req, res, next) => {
  console.log(`CORS aplicado para ${req.method} ${req.url}`);
  next();
});
//startApp();

routes(app);

app.listen(port, () => {
  console.log(`O server esta rodando na porta ${port}`);
});

app.use(errorHandler);

syncModels();
