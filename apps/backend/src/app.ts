import express from "express";
import cors from "cors";
import router from "./routes/index";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bakery POS API funcionando");
});

app.use("/api", router);

export default app;
