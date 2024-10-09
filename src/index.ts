import express from "express";
import { syncModels } from "./app/models/index.js";
import routes from "./app/routes/index.js";
import errorHandler from "./app/middleware/errorHandler.js";

const app = express();

const port = 3001;

//startApp();

routes(app);

app.listen(port, () => {
  console.log(`O server esta rodando na porta ${port}`);
});

app.use(errorHandler);

syncModels();
