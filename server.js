const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use("/css", express.static(path.join(__dirname, "public/css")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.listen(PORT, () => {
  console.log(`ShopPOS website running at http://localhost:${PORT}`);
});
