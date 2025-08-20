import express from "express";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import schoolsRouter from "./routes/schools.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/healthz", (req, res) => res.json({ status: "ok" }));
app.use("/", schoolsRouter);

// central error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

export default app;
