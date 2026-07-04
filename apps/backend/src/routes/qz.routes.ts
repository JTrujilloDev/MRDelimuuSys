import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";

const router = Router();

router.get("/certificate", (req, res) => {
  const certPath = path.join(
    process.cwd(),
    "certificates",
    "digital-certificate.txt",
  );

  const certificate = fs.readFileSync(certPath, "utf8");

  res.type("text/plain");
  res.send(certificate);
});

router.post("/sign", express.text({ type: "*/*" }), (req, res) => {
  try {
    const privateKey = fs.readFileSync(
      path.join(process.cwd(), "certificates", "private-key.pem"),
      "utf8",
    );

    const signer = crypto.createSign("RSA-SHA512");
    signer.update(req.body, "utf8");
    signer.end();
    const signature = signer.sign(privateKey, "base64");

    res.setHeader("Content-Type", "text/plain");
    res.send(signature);
  } catch (err) {
    console.error("SIGN ERROR:", err);
    res.status(500).send("Unable to sign");
  }
});
export default router;
