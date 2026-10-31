import express from "express";
import { fileURLToPath } from "url";
import path from "path"

const port = process.env.PORT || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

app.listen(port, () => {
    console.log("Servidor rodando...");
    console.log(`Acesse http://localhost:${port}`)
})