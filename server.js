const express = require('express');
const path = require('path');
const app = express();

// กำหนดพอร์ต (Render จะกำหนด PORT มาให้ทาง Environment Variable)
const PORT = process.env.PORT || 3000;

// บอกให้ Express เสิร์ฟไฟล์ Static ทั้งหมดที่อยู่ในโฟลเดอร์ 'public'
app.use(express.static(path.join(__dirname, 'public')));

// รัน Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});