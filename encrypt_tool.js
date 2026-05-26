const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const readline = require("readline");
const vm = require("vm");
const ALGORITHM = "aes-256-gcm";
function getKey(password) {
  return crypto.createHash("sha256").update(password).digest();
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

function encrypt(code, password) {
  const iv = crypto.randomBytes(16);
  const key = getKey(password);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(code, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    data: encrypted,
    tag: tag.toString("base64"),
    hash: sha256(encrypted),
  };
}

function buildOutput(payload) {  return `// ----------------------------------------------------
// Encrypted by DBMOD1 Development
// Author: TheQarden
// ----------------------------------------------------
const crypto = require("crypto");
const vm = require("vm");

const payload = ${JSON.stringify(payload, null, 2)};

function getKey(password) {
  return crypto.createHash("sha256").update(password).digest();
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function decrypt(password) {
  if (sha256(payload.data) !== payload.hash) {
    throw new Error("File corrupted or modified");
  }
  const key = getKey(password);
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let code = decipher.update(payload.data, "base64", "utf8");
  code += decipher.final("utf8");
  return code;
}

const password = process.argv[2];
if (!password) {
  console.log("Usage: node <thisfile>.enc.js <password>");
  process.exit(1);
}

try {
  const code = decrypt(password);
  const script = new vm.Script(code, {
    filename: "encrypted.js",
    displayErrors: true,
  });
  script.runInThisContext();
  console.log("\\n✅ Decrypted and executed by DBMOD1 Development\nAuthor: TheQarden");
} catch (e) {
  console.log("❌ Wrong password or file broken");
}
`;
}

(async () => {
  console.log("\n🔐 JS Encrypt Tool by DBMOD1 Development\nAuthor: TheQarden\n");

  const filePath = await ask("Enter file path (.js): ");
  const password = await ask("Enter password: ");

  if (!fs.existsSync(filePath)) {
    console.log("❌ File not found");
    return;
  }

  if (!filePath.endsWith(".js")) {
    console.log("❌ Only .js files allowed");
    return;
  }

  const code = fs.readFileSync(filePath, "utf8");
  const encrypted = encrypt(code, password);

  const dir = path.dirname(filePath);
  const name = path.basename(filePath, ".js");
  const outPath = path.join(dir, `${name}.enc.js`);

  fs.writeFileSync(outPath, buildOutput(encrypted));

  console.log("\n✅ Done!");
  console.log("📁 Output:", outPath);
  console.log("🏷️  Encrypted by DBMOD1 Development\nAuthor: TheQarden");
})();