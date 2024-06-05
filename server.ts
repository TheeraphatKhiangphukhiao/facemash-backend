import http from "http";
import { app } from "./app";


// สร้างหมายเลข port สำหรับ run server
// process.env.port คือ สำหรับดึงเอาหมายเลข port ของ web hosting เมื่อเรานำระบบงานของเราขึ้นไปอยู่บน web hosting ภายนอก ที่ไม่ใช่เครื่องของเรา
// หรือ (||) 3000 คือ ถ้าเราไม่ได้เอาระบบงานของเรา ไปไว้ที่ web hosting ภายนอก ก็จะใช้ port 3000
const port = process.env.port || 3000;

// สร้าง object สำหรับ run server ของตัวเอง
// โดยให้ server นี้ ไปทำงานที่ ไฟล์ app.ts
const server = http.createServer(app);

// listen คือ server เริ่มทำงาน
server.listen(port, () => {
    console.log("\n...Server is started... on PORT: "+port+"\n");
});