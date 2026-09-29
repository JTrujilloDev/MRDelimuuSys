import express from "express";
import cors from "cors";
import router from "./routes/index";


const app = express();

const configuredOrigins = process.env.CORS_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin:
      configuredOrigins?.length
        ? configuredOrigins
        : process.env.NODE_ENV === "production"
          ? false
          : ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.send("Bakery POS API funcionando");
});

app.use("/api", router);

export default app;
