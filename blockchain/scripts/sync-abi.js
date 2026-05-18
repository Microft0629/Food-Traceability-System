// 将编译产物中的 ABI 同步到前端和后端
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "FoodTrace.sol", "FoodTrace.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const abiJson = JSON.stringify(artifact.abi, null, 2);
fs.writeFileSync(path.join(__dirname, "..", "..", "frontend", "src", "contractABI.json"), abiJson);
fs.writeFileSync(path.join(__dirname, "..", "..", "backend", "abi", "FoodTrace.json"), abiJson);
console.log("ABI 已同步 (", artifact.abi.length, "条 )");
