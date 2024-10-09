import { Application } from "express";
import bodyParser from "body-parser";
import serviceOrderRoute from "./serviceOrderRoute";
const routes = (app: Application): void => {
  app.use(bodyParser.json());
  app.use(serviceOrderRoute);
  app.get("/", (req, res) => res.status(200).send("Hi"));
};

export default routes;
