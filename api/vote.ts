import express from "express";
import { queryAsync } from "../connection";
import Mysql from "mysql";
import { PhotoModel } from "../model/photoModel";
import { UserPostRequest } from "../model/userModel";



// export ให้ router สามารถไปใช้งานในไฟล์อื่นได้
// สร้าง object ของ Router ที่อยู่ใน expresss
// express.Router คือ สร้างเส้นทางต่างๆ หรือ api ต่างๆ สำหรับ get, post, put, delete
export const router = express.Router();





// function สำหรับสุ่มตัวเลข 0 ถึง (ค่าสูงสุด - 1)
// Math.trunc => ปัดเศษลง
function RandomNumber(maxValue : number) : number {
    let num = Math.trunc(Math.random() * maxValue);
    return num;
}



// function ค้นหาข้อมูลของ photo ด้วย PID
async function selectPhotoByPID(pid : number) : Promise<PhotoModel>  {
    let photo : PhotoModel[] = [];
    try {
        let sql = Mysql.format(`select * from Photo_Facemash where PID = ?`, [pid]);
        // ส่งคำสั่ง query เพื่อค้นหาข้อมูลของรูป โดยต้องรอการตอบกลับมาก่อน ถึงจะทำงานต่อไป
        photo = await queryAsync(sql) as PhotoModel[];
        return photo[0];
    } catch (error) {
        console.log(error);
    }
    return photo[0];
}


// function คำนวนคะแนนใหม่ของทั้ง 2 รูปที่ส่งเข้ามา
// โดยรับ คะแนนของรูปภาพที่ 1 และ คะแนนของรูปภาพที่ 2 เข้ามา พร้อมกับ ผลการแข่งขันของรูปภาพ 1 กับ 2 (0 คือ แพ้, 1 คือ ชนะ)
// โดย Method นี้จะ retu
function newScoreOfThePhoto(Ra : number, Sa : number, Rb : number, Sb : number) : number {
    // กำหนดค่า k คือปริมาณการเปลี่ยนแปลงของคะแนน --> 16,24,32 (ถ้ามีค่ามาก score จะ + มาก)
    let k = 32;
    // หาความน่าจะเป็นของรูปภาพ 1 ที่จะชนะ
    let Ea = 1 / ( 1 + Math.pow( 10, ((Rb - Ra)/400) ) );
    // หาความน่าจะเป็นของรูปภาพ 2 ที่จะชนะ
    // let Eb = 1 / ( 1 + Math.pow( 10, ((Ra - Rb)/400) ) );
    // คะแนนใหม่ของรูปภาพ 1 ที่ได้จากการคำนวน
    let new_Ra = Ra + k * (Sa - Ea);
    // คะแนนใหม่ของรูปภาพ 2 ที่ได้จากการคำนวน
    // let new_Rb = Rb + k * (Sb - Eb);
    // return กลับออกไปเฉพาะคะแนนใหม่ของตัวเอง (Ra คือ ตัวเองที่เรียกใช้)
    return new_Ra;
}


// function หาความห่างของคะแนนใหม่ กับคะแนนเก่า ว่าได้หรือเสียเท่าไหร่
function calculateScoreWinOrLose( photo : PhotoModel, newScore: number, is_win: number) : { PID: number, score: number, text: String} { //กำหนดรูปแบบตัวแปลที่จะส่งกลับไปมากกว่า 1 ตัว
    let pid = photo.PID;
    let oldScore = photo.score;
    // หาว่าคะแนนใหม่ที่ได้นั้น ได้เท่าไหร่ หรือเสียไปเท่าไหร่
    let score_win_or_lose : number;
    // คำอธิบายการเสีย หรือ ได้คะแนน
    let str : string = '';
    if (oldScore === 0) { // ถ้าคะแนนเริ่มต้นรูปภาพ เป็น 0 คะแนน
        if (is_win === 1) { // แล้วชนะการแข่งขัน
            score_win_or_lose = newScore - oldScore; // จะหาจำนวนคะแนนที่ได้หลังจากชนะ
            str = 'คะแนนเริ่มต้นเป็น 0 แต่ ขนะ (ได้คะแนน)';
        }
        else { // ถ้าคะแนนเริ่มต้น เป็น 0 คะแนน แล้วแพ้การแข่งขัน
            score_win_or_lose = 0; // ถ้าแพ้ก็จะไม่เสียคะแนน เพราะคะแนนเริ่มต้นเป็น 0 อยู่แล้ว
            str = 'คะแนนเริ่มต้นเป็น 0 แต่ แพ้ (ไม่เสียคะแนน) (เพราะไม่มีคะแนนให้เสีย)';
        }
    }
    else { // ถ้าคะแนนเริ่มต้น มากกว่า > 0
        if (is_win === 1) { // แล้วชนะการแข่งขัน
            score_win_or_lose = newScore - oldScore; // จะหาจำนวนคะแนนที่ได้หลังจากชนะ
            str = 'คะแนนเดิม > 0 แต่ ชนะ (ได้คะแนน)';
        }
        // ถ้าคะแนนเริ่มต้น มากกว่า > 0 แล้วแพ้การแข่งขัน
        else {
            if ( newScore < 0 ) { // ถ้าคะแนนใหม่ที่ได้ เป็นค่า ติดลบ
                score_win_or_lose = -oldScore;
                str = 'คะแนนเดิม > 0 แต่ แพ้ (เสียคะแนน) (คะแนนใหม่ที่ได้ เป็นค่า ติดลบ ดังนั้นจึงมีคะแนนให้เสียไปแค่นี้))';
            }
            else { // ถ้าคะแนนใหม่ที่ได้ยังเป็นค่า + อยู่
                score_win_or_lose = -(oldScore - newScore);
                str = 'เริ่มต้น > 0 แต่ แพ้ (เสียคะแนน) (คะแนนใหม่ที่ได้ยังเป็น ค่า + อยู่)';
            }
        }
    }
    // return กลับไปแบบ json (มากกว่า 1 ตัว)
    return { PID: pid, score: score_win_or_lose, text: str };
}


// function update table Photo_Facemash โดย update score ของรูปนี้
// รับ PID และ score ใหม่ที่ได้เข้ามา
async function update_Score_Table_Photo_Facemash(pid : number, score : number) {
    try {
        let newScore = score;
        //ถ้าคะแนนใหม่ที่ได้นั้น เป็นค่าติดลบ จะกำหนดให้นะแนนของรูปภาพนี้เป็น 0
        if (newScore <= 0) {
            newScore = 0;
        }
        // คำสั่ง sql update score ของรูปภาพนี้
        let sql = Mysql.format('UPDATE Photo_Facemash SET score = ? WHERE PID = ?', [newScore, pid]);
        // ส่งคำสั่งไป query โดยรอให้ทำงานเสร็จก่อน
        await queryAsync(sql);
    } catch (error) {
        console.log(error);
    }
}


// function เพิ่มข้อมูลการถูกโหวด ว่ารูปภาพนี้ มีผลแพ้หรือชนะ และมีคะแนนใหม่เป็นเท่าไหร่ พร้อมกับ rank ใหม่ของรูปนี้หลังจากแข่งเสร็จ
// โดยรับ PID , ผลการแข่งขัน (ชนะหรือแพ้), คะแนนที่ได้หรือคะแนนที่เสีย (score_win_or_lose) หลังแข่งเสร็จ, 
async function insert_Table_Vote_Facemash(pid: number, is_win_or_lose: number, score_win_or_lose: number) {
    try {
        //=============================================================== คำสั่ง sql หาว่ารูป PID นี้อยู่อันดับที่เท่าไหร่ (rank) โดยเรียงจาก score มากไปน้อยก่อน
        // สร้าง subquery (ranks_subquery) โดยจะทำการเรียงลำดับ score เพื่อกำหนด rank ให้กับแต่ละ row โดยใช้คำสั่ง ROW_NUMBER() OVER (ORDER BY score DESC) จากนั้นตั้งชื่อว่า 'rank'
        // เมื่อสร้าง subquery โดยกำหนดให้ชื่อเป็น ranks_subquery จากนั้นเลือกเอาเฉพาะ column rank ที่อยู่ใน subquery (ranks_subquery.rank)
        let sql = Mysql.format(`SELECT ranks_subquery.rank
                                    FROM (
                                        SELECT *, (ROW_NUMBER() OVER (ORDER BY score DESC)) as 'rank'
                                        FROM Photo_Facemash
                                    ) AS ranks_subquery
                                WHERE PID = ?`, [pid]);
        // ส่งคำสั่ง query ไป
        let result: { rank: number }[] = await queryAsync(sql) as { rank: number }[]; // กำหนดรูปแบบ การรับข่้อมูล เพราะค่าที่ตอบกลับมานั้น คือ [ { rank: 1 } ]
        //===================================================== หลังจากรู้แล้วว่า รูปภาพนี้อยู่ rank ไหน ดังนั้นจะ insert ข้อมูลให้กับ Table Vote_Facemash
        // rank ของรูปภาพนี้ โดยดึงเอาจาก column rank ที่ได้จาก subquery (ranks_subquery.rank)
        let rank = result[0].rank;
        // คำสั่ง sql สำหรับ insert ค่าใหม่เมื่อมีการ Vote รูปภาพนี้ โดยใช้ NOW() เพื่อ insert เวลา ณ ขณะนั้นที่กด vote เข้าไปด้วย พร้อมกับ rank ของรูปที่เปลี่ยนไป หลังจากแข่งขันกันเสร็จ
        sql = Mysql.format("INSERT INTO Vote_Facemash(`is_win_or_lose`,`score_win_or_lose`,`rank`,`date_time`,`PID`) VALUES(?, ?, ?, NOW(), ?)",
                                                        [is_win_or_lose, score_win_or_lose, rank, pid]);
        // ส่งคำสั่ง query
        await queryAsync(sql);
    } catch (error) {
        console.log(error);
    }
}


// function สำหรับ Insert ข้อมูล Ranking ให้กับทุกรูปภาพ หลังจากการแข่งขันคู่ใดคู่หนึงจบลง (เพราะ หลังจากที่รูปภาพใดก็ได้ แข่งขันเสร็จ คะแนนของรูปภาพคู่นั้นๆจะมีการเปลี่ยนแปลง ดังนั้น rank หรืออันดับก็มีการเปลี่ยนแปลงไปด้วย ดังนั้นจึงต้องมีการเก็บข้อมูลเรื่อยๆ)
async function insert_Table_Ranking_Facemash() {
    try {
        // function สำหรับดึง PID, score ของรูปภาพทุกอันที่อยู่ใน database โดยดึง score ของรูปภาพออกมา เพื่อบอกให้รู้ว่า รู้ภาพนี้มีคะแนนเท่าไหร่ (ณ วันเวลานั้นๆ)
        // คำสั่ง sql สำหรับดึงข้อมูลรูปภาพทุกอัน พร้อมกับ rank ของรูปนั้นๆ โดยเรียงจาก score ของรูปภาพ
        let sql = `SELECT PID, score, (ROW_NUMBER() OVER (ORDER BY score DESC)) as 'rank' FROM Photo_Facemash`;
        // ส่งคำสั่ง query แบบ await ออกไป
        let pid_score_rank : { PID: number, score: number, rank: number }[] = await queryAsync(sql) as { PID: number, score: number, rank: number }[]; // กำหนดรูปแบบการรับข้อมูลที่ตอบกลับมาจาก database
        // ทำการ loop ทุกรูปภาพเพื่อนำข้อมูล PID, rank, date_time เข้าไปเก็บใน Table Ranking_Facemash
        for (let i = 0; i < pid_score_rank.length; i++) {
            // คำสั่ง sql สำหรับเก็บข้อมูล PID, score, date_time, rank ของแต่ละรูป ณ เวลานั้นๆ
            sql = Mysql.format('INSERT INTO Ranking_Facemash(`score`, `date_time`, `PID`, `rank`) VALUES(? , NOW(), ?, ?)', [pid_score_rank[i].score, pid_score_rank[i].PID, pid_score_rank[i].rank]);
            await queryAsync(sql);
        }
    } catch (error) {
        console.log(error);
    }
}



// สุ่มรูปภาพใหม่ โดยที่ pid จะไม่ซ้ำกันกับ pid ของศัตรู
async function randomPhoto( enemy_pid : number ) : Promise<PhotoModel> {
    // คำสั่ง sql select รูปภาพ ที่ pid ไม่ซ้ำกับศัตรู
    let sql = Mysql.format('SELECT * FROM Photo_Facemash WHERE PID != ?', [enemy_pid]);
    // ส่งคำสั่งไป query โดยรอการตอบกลับมาก่อน (await)
    let result : PhotoModel[] = await queryAsync(sql) as PhotoModel[];
    // สุ่มรูปภาพจาก 0 ถึง จำนวนข้อมูลที่ตอบกลับมา-1
    let randomNum = RandomNumber(result.length);
    // รูปภาพที่สุ่มได้
    let photo : PhotoModel = result[randomNum];
    // ส่ง ข้อมูลของรูปภาพ กลับไป
    return photo;
}


//==================================================================================================== function ค้นหา user ด้วย IPD ของรูปภาพ
// โดยส่ง PID ของรูปภาพเข้ามา
async function getUserByPhotoPID( pid : number ) {
    //=============================================== sql ค้นหาข้อมูลคนที่เป็นเจ้าของรูปภาพนั้นๆ ด้วย PID รูปภาพ
    let sql = Mysql.format(`SELECT User_Facemash.*
                        FROM Photo_Facemash, User_Facemash
                        WHERE Photo_Facemash.UID = User_Facemash.UID
                        AND PID = ?`, [pid]);
    // ส่ง query และกำหนดรูปแบบการรับข้อมูล
    let user : UserPostRequest[] = await queryAsync(sql) as UserPostRequest[];
    // ส่งกลับ user ที่เป็นเจ้าของรูปภาพนี้
    return user[0];
}












//=========================================================================================================== api สุ่มรูปภาพที่่อยูใน Database ไปแสดงเพื่อ vote --> http://127.0.0.1:3000/vote/
router.get('/', (request, response) => {
    response.send({ 'text': 'hi i am vote.ts' })
});



//=========================================================================================================== api สำหรับการ Vote รูปภาพ (คือการแข่งขั้นกันระหว่าง รูปที่ 1 กับ 2 จากนั้น ทำการ update Table Photo_Facemash และ Table Vote_Facemash) --> http://127.0.0.1:3000/vote/votePhoto/
router.post('/votePhoto', async (request, response) => {
    try {
        // ดึงข้อมูลมาจาก body โดยดึงจาก key ที่ชื่อว่า ( vote_data:[ {"PID":..., "is_win":...}, {"PID":..., "is_win":...}] เป็น list )
        let data = request.body['vote_data'];
        // PID กับ is_win ของรูปที่ 1
        let pidOfPhoto_1 = data[0]['PID']; 
        let isWinOfphoto_1 = data[0]['is_win'];
        // PID กับ is_win ของรูปที่ 2
        let pidOfPhoto_2 = data[1]['PID']; 
        let isWinOfphoto_2 = data[1]['is_win'];

        //===================================================================== คำสั่ง sql ดึงข้อมูลของรูปที่ 1
        let photo_1 : PhotoModel = await selectPhotoByPID(pidOfPhoto_1) as PhotoModel;
        //===================================================================== คำสั่ง sql ดึงข้อมูลของรูปที่ 2
        let photo_2 : PhotoModel = await selectPhotoByPID(pidOfPhoto_2) as PhotoModel;

        //===================================================================== คำนวนคะแนนใหม่ของรูปภาพ 1 (ตัวเอง) โดยส่ง score กับ ผลการแข่งขันของตัวเองเข้าไป พร้อมกับ score และผลการแข่งขันของ ศัตรู
        let newScoreOfPhoto_1 = newScoreOfThePhoto(photo_1.score, isWinOfphoto_1, photo_2.score, isWinOfphoto_2);
        //===================================================================== คำนวนคะแนนใหม่ของรูปภาพ 2 (ตัวเอง) โดยส่ง score กับ ผลการแข่งขันของตัวเองเข้าไป พร้อมกับ score และผลการแข่งขันของ ศัตรู
        let newScoreOfPhoto_2 = newScoreOfThePhoto(photo_2.score, isWinOfphoto_2, photo_1.score, isWinOfphoto_1);

        //===================================================================== จำนวนคะแนนที่ได้เมื่อชนะ หรือจำนวนคะแนนที่เสียเมื่อแพ้ ของทั้ง 2 รูปภาพ
        let score_win_or_lose_photo_1 = calculateScoreWinOrLose( photo_1, newScoreOfPhoto_1, isWinOfphoto_1);
        let score_win_or_lose_photo_2 = calculateScoreWinOrLose( photo_2, newScoreOfPhoto_2, isWinOfphoto_2);

        //===================================================================== update คะแนนให้กับรูปภาพทั้ง 2 ตัว หลังจากแข่งขันกัน
        await update_Score_Table_Photo_Facemash(photo_1.PID, newScoreOfPhoto_1);
        await update_Score_Table_Photo_Facemash(photo_2.PID, newScoreOfPhoto_2);

        //===================================================================== เก็บข้อมูลการโหวดว่า การแข่งขันในครั้งนี้ รูปภาพ PID นี้ ถ้าชนะจะได้คะแนนเท่าไหร่, แพ้เสียคะแนนเท่าไหร่, rank ที่ได้หลังจากแข่ง, วันเวลาในการแข่ง
        await insert_Table_Vote_Facemash(photo_1.PID, isWinOfphoto_1, score_win_or_lose_photo_1.score);
        await insert_Table_Vote_Facemash(photo_2.PID, isWinOfphoto_2, score_win_or_lose_photo_2.score);
        
        //====================================================================== Insert ข้อมูล Ranking ของทุกรูป หลังจากแข่งขันเสร็จสิ้น (เพราะถ้ามีการ ชนะ หรือ แพ้ เกิดขึ้น Ranking หรือการจัดอันดับของทุกคนก็จะเปลี่ยนไป) ดังนั้นจะอิงจาก score ล่าสุดของแต่ละรูปในวันนั้น โดยมี date_time เป็นตัวบอกเวลาล่าสุดของวันนั้น
        // ถ้า function ไม่ได้ส่งค่าอะไรกลับออกมา แต่เป็นการ update database อาจไม่ต้องใช้ await ก็ได้ (แต่ต้องพิจารณาดีๆก่อนว่าต้องรอให้ update database เสร็จก่อนหรือไม่แล้วค่อยทำงาน)
        // ถ้ากรณีนี้อาจไม่จำเป็นต้องใช้ await เพื่อให้ api เส้นนี้ทำงานเร็วขึ้นนิดหน่อย
        // แต่ในการทำงานของ function นี้จะต้องทำแบบ await เพื่อให้ทำงานได้ถูกต้อง
        insert_Table_Ranking_Facemash();

        //===================================================================== หลังจาก vote คู่นี้เสร็จแล้ว จะทำการสุ่มรูปใหม่มาแข่งกัน (โดยสุ่มใหม่ทั้งหมด ไม่ว่าจะแพ้หรือชนะ)

        // สุ่มรูปที่ 1 ใหม่ โดยส่ง pid ของรูปที่ 2 เข้าไปเพื่อไม่ให้ซ้ำกัน
        photo_1 = await randomPhoto(photo_2.PID) as PhotoModel;
        // สุ่มรูปภาพที่ 2 ใหม่ โดยส่ง pid ของ รูปที่ 1 เข้าไป เพื่อไม่ให้ซ้ำกัน
        photo_2 = await randomPhoto(photo_1.PID) as PhotoModel;


        // // ถ้ารูปที่ 1 ชนะ ก็จะดึงข้อมูลของรูปที่ 1 มาใหม่ (เพราะจะได้ข้อมูลใหม่หลังจาก update score)
        // // และทำการสุ่มรูปที่ 2 ใหม่ เพื่อไปแข่งกับรูปที่ 1
        // if (isWinOfphoto_1 === 1) {
        //     photo_1 = await selectPhotoByPID(pidOfPhoto_1) as PhotoModel;
        //     // สุ่มรูปภาพที่ 2 ใหม่ โดยส่ง pid ของ pid ของ รูปที่ 1 เข้าไป เพื่อไม่ให้ซ้ำกัน
        //     photo_2 = await randomPhoto(photo_1.PID) as PhotoModel;
        // }
        // // ถ้ารูปที่ 1 แพ้ ก็จะดึงข้อมูลของรูปที่ 2 มาใหม่ (เพราะจะได้ข้อมูลใหม่หลังจาก update score)
        // // และทำการสุ่มรูปที่ 1 ใหม่ เพื่อไปแข่งกับรูปที่ 2
        // else {
        //     photo_2 = await selectPhotoByPID(pidOfPhoto_2) as PhotoModel;
        //     // สุ่มรูปภาพที่ 1 ใหม่ โดยส่ง pid ของ pid ของ รูปที่ 2 เข้าไป เพื่อไม่ให้ซ้ำกัน
        //     photo_1 = await randomPhoto(photo_2.PID) as PhotoModel ;
        // }

        //=============================================== sql ค้นหาข้อมูลคนที่เป็นเจ้าของรูปภาพที่ 1
        let user_1 : UserPostRequest = await getUserByPhotoPID(photo_1.PID);

        //=============================================== sql ค้นหาข้อมูลคนที่เป็นเจ้าของรูปภาพที่ 2
        let user_2 : UserPostRequest = await getUserByPhotoPID(photo_2.PID);

        //===================================================================== ตอบกลับ json โดยส่ง ข้อมูลการ update score ของทั้ง 2 รูปที่เคยแข่งกันมาก่อน และ รูปภาพเดิมที่ชนะ กับรูปภาพใหม่ที่ได้จากการสุ่ม (เพราะรูปภาพก่อนหน้านี้แพ้จากการแข่งขั้น จึงต้องสุ่มใหม่) และ user ที่เป็นเจ้าของรูปภาพนั้นๆ
        response.status(200).json({
            "updateScore" : [score_win_or_lose_photo_1, score_win_or_lose_photo_2],
            "newPhotoRandom" : [photo_1, photo_2],
            users: [user_1, user_2]
        });
    } catch (error) {
        response.status(200).json(error);
    }
});




