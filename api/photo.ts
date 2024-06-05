import express from "express";
import { connection, queryAsync } from "../connection";
import { PhotoModel } from "../model/photoModel";
import Mysql from "mysql";
import { PhotoRankingYesterdayModel } from "../model/photoRankingYesterdayModel";
import util from "util";
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






//=================================================================== fuction สำหรับดึงเอา ข้อมูลของรูปภาพนี้ ด้วย PID (ได้แก่ score และ rank ของรูปภาพนี้)
// กำหนดชนิดข้อมูลที่ function นี้จะส่งค่ากลับไปคือ ส่งกลับไปแบบ json { score: number, rank: number }
async function getScoreAndRankOfPhotoByPID(pid : number) : Promise<{ score: number; rank: number; }> {
    let result : { score: number, rank: number }[] = [];
    try {
        // คำสั่ง sql สำหรับดึงเอาข้อมูลของรูปภาพ โดยจะได้ score กับ rank ของรูปภาพมาด้วย
        //=============================================================== คำสั่ง sql หาว่ารูป PID นี้อยู่อันดับที่เท่าไหร่ (rank) โดยเรียงจาก score มากไปน้อยก่อน
        // สร้าง subquery (ranks_subquery) โดยจะทำการเรียงลำดับ score เพื่อกำหนด rank ให้กับแต่ละ row โดยใช้คำสั่ง RANK()OVER (ORDER BY score DESC) จากนั้นตั้งชื่อว่า 'rank'
        // เมื่อสร้าง subquery โดยกำหนดให้ชื่อเป็น ranks_subquery จากนั้นเลือกเอาเฉพาะ column rank ที่อยู่ใน subquery (ranks_subquery.rank)
        let sql = Mysql.format(`SELECT ranks_subquery.score, ranks_subquery.rank
                                    FROM (
                                        SELECT *, (ROW_NUMBER() OVER (ORDER BY score DESC)) as 'rank'
                                        FROM Photo_Facemash
                                    ) AS ranks_subquery
                                WHERE PID = ?`, [pid]);
        // ส่งคำสั่ง query
        result = await queryAsync(sql) as { score: number, rank: number }[]; // กำหนดชนิดข้อมูลเพื่อรับข้อมูลที่ตอบกลับมา คือ [ { score: 14, rank: 1 } ]
        // ส่งค่ากลับไป โดยเป็นแบบ json
        return { score : result[0].score,
                rank : result[0].rank };
    } catch (error) {
        console.log(error);
    }
    return { score : result[0].score,
            rank : result[0].rank };
}


//===================================================================== function สำหรับดึงเอาจำนวนทั้งหมดที่รูปภาพนี้เคยชนะ กับเคยแพ้ ด้วย PID
// กำหนดรูปแบบที่ function นี้จะส่งข้อมูลกลับไป
async function getWinsAndLosesOfPhotoByIPD(pid : number) : Promise<{ wins: number; loses: number; }> {
    let result : { wins: number, loses: number }[] = [];
    try {
        // sql สำหรับดึงเอาจำนวนที่รูปนี้ชนะ กับจำนวนที่แพ้
        // โดยการสร้าง subquery 2 ตัวคือ จำนวนที่ชนะ และจำนวนที่แพ้ ของรูปนี้ (PID)
        let sql = Mysql.format(`select *
                                FROM
                                    (SELECT COUNT(is_win_or_lose) AS wins
                                    FROM Vote_Facemash
                                    WHERE PID = ?
                                    AND is_win_or_lose = 1) AS wins_sub
                                ,
                                    (SELECT COUNT(is_win_or_lose) AS loses
                                    FROM Vote_Facemash
                                    WHERE PID = ?
                                    AND is_win_or_lose = 0) AS loses_sub`,
                                [pid, pid]);
        // ส่งคำสั่งไปแบบ query โดยรอการตอบกลัมามาก่อน
        result =  await queryAsync(sql) as { wins: number, loses: number }[]; // กำหนดรูปแบบการรับข้อมูลที่ตอบกลับมา คือ [ { wins: 4, loses: 3 } ]
        // ส่งข้อมูลกลับไปแบบ json
        return {wins : result[0].wins,
                loses : result[0].loses};
    } catch (error) {
        console.log(error);
    }
    return {wins : result[0].wins,
        loses : result[0].loses};
}



//============================================================================ function สำหรับแสดง Ranking หรือ อันดับของรูปภาพนั้นๆด้วย PID ว่ารูปภาพนี้ใน 7 วันที่ผ่านมา (รวมวันนี้ด้วย) เคยอยู่ rank อะไรมาก่อน
// โดยรับ PID และ วันที่ 7 วันย้อนหลังที่ต้องการหา rank
async function getRankingGraphForThePhoto(pid: number, pastSevenDays: string[]) : Promise<number[]> {
    // rank ของทั้ง 7 วันย้อนหลัง ของรูปภาพ PID นี้
    let rank_past_7_days : number[] = [];
    // วนรอบทั้ง 7 วันที่ต้องการหา
    for (let i = 0; i < pastSevenDays.length; i++) {
        try {
            // sql สำหรับนับจำนวนรูปภาพทั้งหมดที่อยู่ใน database
            let sql = 'SELECT COUNT(PID) as photos_amount FROM Photo_Facemash';
            // จำนวนรูปภาพที่มีอยู่ใน database
            // let limit : { photos_amount: number } = await queryAsync(sql) as { photos_amount: number };

            // คำสั่ง sql สำหรับดึงเอา rank ล่าสุดของ วันนั้นๆ (7 วัน) ของ PID รูปๆนี้
            sql = Mysql.format('SELECT * FROM Ranking_Facemash WHERE DATE(date_time) = ? AND PID = ? ORDER BY date_time DESC LIMIT 1' ,[pastSevenDays[i], pid]);
            
            // ส่ง query และกำหนดรูปแบบข้อมูลที่่ตอบกลับมามา database
            let result : { rank: number }[] = await queryAsync(sql) as { rank: number }[]; // รูปแบบการตอบกลับของ database คือ [ { rank : 5 } ]
            // ข้อมูล rank ที่ได้ในแต่ละรอบการทำงาน
            let rank = result[0].rank;
            // เพิ่ม rank ที่ได้ในแต่ละวัน (7 วันย้อนหลัง) ของ PID รูปภาพนี้ เอาไปใน list
            rank_past_7_days.push(rank);
        } catch (error) {
            // ถ้ารูปนี้พึ่ง upload เข้าระบบมาใหม่ ดังนั้น เมื่อทำการค้นหา rank 7 วันก่อนหน้านี้ จะไม่เจอ ดังนั้นจะกำหนดค่าของ rank 7 ก่อนให้เป็น 0 แทน
            rank_past_7_days.push(0);
        }

    }
    // ส่ง rank 7 วันย้อนหลัง ของ PID รูปนี้กลับออกไป
    return rank_past_7_days;
}


//==================================================================================== function สำหรับ select จำนวนที่รูปนี้ชนะ, จำนวนที่รูปนี้แพ้, จำนวนคะแนนที่ได้เมื่อชนะ, จำนวนคะแนนที่เสียเมื่อแพ้ ของรูปภาพนี้ทั้ง 7 วันย้อนหลัง ด้วย PID ของรูปภาพ และวันเวลาที่ต้องการค้นหา
// โดยรับ PID และ วันที่ 7 วันย้อนหลังที่ต้องการค้นหาของรูปภาพเข้ามา และกำหนดรูปแบบการตอบกลับไปแบบ json โดยข้อมูลจะเป็นแบบ list
async function getWinsAmount_LosesAmount_WinsScore_LosesScore(pid : number, pastSevenDays : string[]) : Promise<{ wins_amount: number[]; loses_amount: number[]; wins_score: number[]; loses_score: number[]; }> {
    // สร้าง list ของจำนวนครั้งที่รูปนี้ชนะ ของทั้ง 7 วันย้อนหลัง
    let wins_amount_past7Days : number[] = [];
    // สร้าง list ของจำนวนครั้งที่รูปนี้แพ้ ของทั้ง 7 วันย้อนหลัง
    let loses_amount_past7Days : number[] = [];
    // สร้าง list ของจำนวนคะแนนที่ได้เมื่อชนะ ของทั้ง 7 วันย้อนหลัง
    let wins_score_past7Days : number[] = [];
    // สร้าง list ของจำนวนคะแนนที่เสียเมื่อแพ้ ของทั้ง 7 วันย้อนหลัง
    let loses_score_past7Days : number[] = [];
    // loop สำหรับดึงข้อมูลทั้ง 7 วันย้อนหลัง
    for (let i = 0; i < pastSevenDays.length; i++) {
        try {
            // sql สำหรับ query จำนวนที่ชนะ, จำนวนที่แพ้, จำนวนคะแนนที่ได้เมื่อชนะ, จำนวนคะแนนที่เสียเมื่อแพ้ ของรูปภาพ PID นี้ทั้ง 7 วันย้อนหลัง
            // โดยแบ่งออกเป็น 4 Subquery ได้แก่ winsAmountView, losesAmountView, winsScoreView, losesScoreView
            // Subquery winsAmountView จะทำการ ดึงเอาจำนวนครั้งที่รูปนี้ชนะ ในวันนั้นๆ
            // Subquery losesAmountView จะทำการ ดึงเอาจำนวนครั้งที่รูปนี้แพ้ ในวันนั้นๆ
            // Subquery winsScoreView จะทำการ รวมคะแนนทั้งหมดที่ ได้ เมื่อรูปนี้ชนะ ในวันนั้นๆ
            // Subquery losesScoreView จะทำการ รวคะแนนทั้งหมดที่ เสีย เมื่อรูปนี้แพ้ ในวันนั้นๆ
            // ในกรณีที่วันใดวันหนึง รูปภาพนี้ไม่โดยถูก vote เลยในวันนั้นๆ ค่าแต่ละค่าที่ดึงออกมา จะเป็น null ดังนั้นจะใช้ IFNULL() กำหนดให้กับตัวแปลที่เป็น null ให้เปลี่ยนเป็น 0 แทน จากกนั้นใช้ AS เพื่อตั้งชื่อให้กับ column นั้นๆ
            let sql = `SELECT
                            IFNULL(winsAmountView.wins_amount, 0) AS wins_amount,
                            IFNULL(losesAmountView.loses_amount, 0) AS loses_amount,
                            IFNULL(winsScoreView.wins_score, 0) AS wins_score,
                            IFNULL(losesScoreView.loses_score, 0) AS loses_score
                        FROM   
                            (SELECT (COUNT(is_win_or_lose)) AS wins_amount FROM Vote_Facemash WHERE PID = ? AND is_win_or_lose = 1 AND DATE(date_time) = ?) AS winsAmountView
                        ,
                            (SELECT (COUNT(is_win_or_lose)) AS loses_amount FROM Vote_Facemash WHERE PID = ? AND is_win_or_lose = 0 AND DATE(date_time) = ?) AS losesAmountView
                        ,
                            (SELECT (SUM(score_win_or_lose)) AS wins_score FROM Vote_Facemash WHERE PID = ? AND is_win_or_lose = 1 AND DATE(date_time) = ?) AS winsScoreView
                        ,
                            (SELECT (SUM(score_win_or_lose)) AS loses_score FROM Vote_Facemash WHERE PID = ? AND is_win_or_lose = 0 AND DATE(date_time) = ?) AS losesScoreView`;
            // กำหนดข้อมูลให้กับ ตัวแปลที่อยู่ในคำสั่ง sql โดยกำหนด PID และ วันที่ทั้ง 7 วันย้อนหลัง(จะเป็น loop)
            sql = Mysql.format(sql, [
                pid, pastSevenDays[i],
                pid, pastSevenDays[i],
                pid, pastSevenDays[i],
                pid, pastSevenDays[i],
            ]);
            // ส่งคำสั่ง query ออกไป และกำหนดรูปแบบการรับข้อมูลที่ตอบกลับมาจาก database คือ [ { wins_amount : 1, loses_amount : 6, wins_score : 54, loses_score : -24 } ]
            let result : { wins_amount:number, loses_amount:number, wins_score:number, loses_score:number }[] = await queryAsync(sql) as { wins_amount:number, loses_amount:number, wins_score:number, loses_score:number }[];
            // เพิ่มข้อมูลเอาไปใน list ที่กำหนดไว้ ของทั้ 4 ข้อมูลที่ตอบกลับบมาในแต่ละครั้งของ loop
            wins_amount_past7Days.push(result[0].wins_amount);
            loses_amount_past7Days.push(result[0].loses_amount);
            wins_score_past7Days.push(result[0].wins_score);
            loses_score_past7Days.push(result[0].loses_score);
        } catch (error) {
            console.log('\nlog ค่า 7 วันย้อนหลัง : ',error);
        }
    }
    // ส่งค่ากลับออกไปแบบ json โดยค่าที่ส่งออกไปนั้น จะเป็น list
    return {
        wins_amount : wins_amount_past7Days,
        loses_amount: loses_amount_past7Days,
        wins_score : wins_score_past7Days,
        loses_score : loses_score_past7Days
    };
}


//=================================================================================================== function สำหรับหาจำนวนรูปภาพที่มีการแข่งขันกันจริงๆ และเลื่อน rank กันไปมากันจริงๆ ของวันนั้นๆ
// โดยรับ วันที่ต้องการค้นหาเข้ามา
async function getPhotosAmountYesterday( yesterday: string ) : Promise<number> {
    try {
        // sql สำหรับดึงเอา จำนวน รูปภาพจริงๆ ที่มีการเลื่อน rank กันไปมาของเมื่อวาน (เพราะถ้าเราต้องการที่จะรู้ว่า เมื่อวานใครอยู่ rank อะไรบ่าง เราต้องรู้ก่อนว่าเมื่อวานนั้นมีรูปภาพอะไรบ่าง ที่มีการแข่งขันกันและเลื่อน rank กันไปมา ดังนั้นจึงจะตรวจสอบจำนวนของรูปภาพด้วย PID ของรูปภาพ )
        let sql = Mysql.format(`SELECT COUNT(PID) as 'limit'
                                FROM
                                    (SELECT view_photos_by_date.PID
                                    FROM
                                        (SELECT * FROM Ranking_Facemash WHERE DATE(date_time) = ? ORDER BY date_time DESC) as view_photos_by_date
                                    GROUP BY view_photos_by_date.PID) as view_new02`, [yesterday]);
        // ส่งคำสั่ง query ไปและกำหนดรูปแบบข้อมูลที่ได้รับกลับมา
        let photosAmountYesterday : { limit: number }[] = await queryAsync(sql) as { limit: number }[];
        // ส่งค่า จำนวนรูปภาพในวันนั้นๆ ที่มีการแข่งขันกันจริงๆกลับไป
        return photosAmountYesterday[0].limit;
    } catch (error) {
        console.log(error);
        return 1;
    }
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







//========================================================= api สุ่มรูปภาพที่่อยูใน Database ไปแสดงเพื่อ vote --> http://127.0.0.1:3000/photo/
router.get('/', (request, response) => {
    response.send({ 'text': 'hi i am photo.ts' })
});


//========================================================= api select รูปภาพด้วย PID
router.get('/selectPhotoByPID/:PID', async (request, response) => {
    try {
        // ดึงค่าออกมาจากตัวแปล PID ที่อยู่ใน part แบบ get
        let pid = request.params.PID;
        // เรียกใช้ function ที่เรียก query อีกที่เพื่อดึงข้อมูลของรูปภาพด้วย PID
        let photo : PhotoModel = await selectPhotoByPID( Number(pid) );
        // ส่งข้อมูลกลับไป
        response.status(200).json(photo);
    } catch (error) {
        response.status(200).json(error);
    }
});


//========================================================= api random รูปภาพมา 2 รูปภาพ และส่งข้อมูลของคนที่เป็นเจ้าของของรูป 2 อันนี้ไปด้วย เพื่อรอการ vote เมื่อเปิดหน้า Vote Page ครั้งแรก --> http://127.0.0.1:3000/photo/randomPhoto
router.get('/randomPhoto', (request, response) => {
    try {
        //============================================ หารูปที่ 1
        // สำสั่ง sql ดึงข้อมูลรูปทุกรูปใน database
        let sql = 'select * from Photo_Facemash';
        // ส่งคำสั่ง query ไปหา Database
        connection.query(sql, (error, result) => {
            if (error) {
                response.status(200).json(error);
            }
            else {
                // สุ่มมา 1 รูปภาพโดยสุ่มค่าระหว่าง 0 - จำนวนรูปภาพสูงสุด
                let randomNum = RandomNumber(result.length);
                // รูปภาพที่ 1 ที่ถูก random มาก่อน
                let photo_1 : PhotoModel = result[randomNum];

                //============================================= หารูปที่ 2
                // คำสั่ง sql ดึงรูปภาพที่ 2 โดยที่ pid ห้ามซ้ำกับรูปที่ 1
                sql = Mysql.format(`SELECT * FROM Photo_Facemash WHERE PID != ?`, [photo_1.PID]);
                // ส่งคำสั่ง sql เพื่อดึงข้อมูลตามเงื่อนไขการหารูปที่2
                connection.query(sql, async (error, result) => {
                    if (error) {
                        response.status(200).json(error);
                    }
                    else {                                                                                                                      // ถ้าได้ข้อมูลมา แสดงว่า ไม่มีรูปภาพไหนที่มี score เท่ากันกับรูปภาพที่ photo_1 (เจอรูปภาพทั้ง 10 ตัว ที่มีคะแนนมากกว่า photo_1 จำนวน 5 ตัว และคะแนนน้อยกว่า photo_1 จำนวน 5 ตัว)
                        // สุ่มตัวเลขที่อยู่ระหว่าง 0 - จำนวนข้อมูลที่ตอบกลับมา
                        randomNum = RandomNumber(result.length);
                        // รูปภาพที่ 2 ที่ถูก random มา
                        let photo_2 : PhotoModel = result[randomNum];

                        //=============================================== sql ค้นหาข้อมูลคนที่เป็นเจ้าของรูปภาพที่ 1
                        let user_1 : UserPostRequest = await getUserByPhotoPID(photo_1.PID);

                        //=============================================== sql ค้นหาข้อมูลคนที่เป็นเจ้าของรูปภาพที่ 2
                        let user_2 : UserPostRequest = await getUserByPhotoPID(photo_2.PID);

                        //=========================================================== ส่งกลับข้อมูล รูปที่ 1 และ 2
                        response.status(200).json({
                            photos : [photo_1, photo_2],
                            users: [user_1, user_2]
                        });
                    }
                });
            };
        });
    } catch (error) {
        response.status(200).json(error);
    }
})


//================================================================== api แสดงอันดับ ranking ของรูปภาพทั้งหมดของวันนี้ (ปัจจุบัน) และ rank ของเมื่อวาน --> http://127.0.0.1:3000/photo/photosRanking
router.get('/photosRanking', async (request, response) => {
    try {

        //============================================================================= สำหรับดึงข้อมูล ranking ของเมื่อวาน
        // สร้าง object ของวันที่ วันนี้
        let date = new Date(); // วันปัจจุบัน (วันนี้)
        date.setDate(date.getDate() - 1); // หาวันที่ย้อนหลัง โดยการลบไป 1 วัน
        // toISOString รูปแบบเวลาคือ "2024-03-23T15:41:56.366Z" แต่ไม่ต้องการ วินาที ดังนั้นทำการแบ่ง string ด้วยตัว T และเอาเฉพาะ yyyy-mm-dd [0]
        let yesterday = date.toISOString().split('T')[0]; // yyyy-mm-dd ของเมื่อวาน

        // ส่งคำสั่ง query ไปและกำหนดรูปแบบข้อมูลที่ได้รับกลับมา
        // จำนวนรูปภาพที่มีการแข่งขัน และเลื่อน rank กันไปมาจริงๆ ของเมื่อวาน (ช่วงท้ายของวัน)
        let photosAmountYesterday = await getPhotosAmountYesterday(yesterday);

        //======================================================================== คำสั่ง sql สำหรับดึงข้อมูลรูปภาพ โดยเรียงเรียงลำดับ score ของรูปภาพ จากมาก ไป น้อย (ของวันนี้ ปัจจุบัน) เฉพาะ 10 อันดับแรกเท่านั้น และบอกเพิ่มด้วยว่า แต่ละรูปที่ได้มานั้น เมื่อวานมันเคยอยู่ rank อะไรมาก่อน
        let sql = 'SELECT * FROM Photo_Facemash ORDER BY score  DESC LIMIT 10';
        // ranking ของวันนี้ 10 ตัว
        let ranking_photos_today : PhotoModel[] = await queryAsync(sql) as PhotoModel[];
        // rank ของเมื่อวานของ 10 รูปนี้
        let yesterday_rank_of_photos_today : number[] = [];
        // หาว่ารูปและรูปว่า rank ของเมื่อวานนั้น เขาเคยอยู่ rank ไหนมาก่อน โดยใช้ loop เข้าถึงรูปที่ละรูป (10 รูป)
        for (let i = 0; i < ranking_photos_today.length; i++) {
            // คำสั่ง sql สำหรับดึงเอา rank ล่าสุดของ เมื่อวาน ด้วย PID รูปๆนี้
            sql = Mysql.format('SELECT `rank` FROM Ranking_Facemash WHERE DATE(date_time) = ? AND PID = ? ORDER BY date_time DESC LIMIT 1' ,[yesterday, ranking_photos_today[i].PID]);
            // rank เมื่อวานของรูปนี้ที่เคยอยู่
            let ysterdayRankOfThePhoto : { rank : number }[] = await queryAsync(sql) as { rank : number }[];
            // ถ้า rank เมื่อวานของรูปนี้ๆ มี จะกำหนดเข้าไปใน list
            if (ysterdayRankOfThePhoto.length > 0) {
                yesterday_rank_of_photos_today.push(ysterdayRankOfThePhoto[0].rank);
            }
            else {// ถ้า rank เมื่อวานของรูปนี้ๆ ไม่มี (null) จะให้เป็น 0 ไปก่อน
                yesterday_rank_of_photos_today.push(0);
            }
        }
        

        //============================================================================= คำสั่ง sql สำหรับ select ranking รูปภาพทั้งหมด ของเมื่อวาน (โดยจะเอา 10 อันดับแรกของเมื่อวานเท่านั้น)
        // 1. สร้าง subquery ที่ชื่อว่า view_rank_yesterday เพื่อ select ข้อมูลทั้งหมดของรูปภาพที่เป็นของเมื่อวาน DATE(date_time) = 'yyyy-mm-dd' (LIMIT = ? คือจำนวนรูปภาพจริงๆที่มีการเลื่อน rank กันไปมา)
        // 2. ดึงข้อมูลที่ต้องการจาก subquery ที่ชื่อว่า view_rank_yesterday
        // 3. ทำการ inner join table Photo_Facemash เพื่อดึงข้อมูลที่ต้องการของรูปภาพ โดยอิงจาก PID ที่ตรงกัน
        // sql = Mysql.format(`SELECT view_rank_yesterday.score as score_yesterday, view_rank_yesterday.date_time, Photo_Facemash.PID, Photo_Facemash.name, Photo_Facemash.photo_url, Photo_Facemash.UID
        //                     FROM
        //                         (SELECT * FROM Ranking_Facemash WHERE DATE(date_time) = ? ORDER BY date_time DESC LIMIT ?) as view_rank_yesterday
        //                     INNER JOIN Photo_Facemash ON view_rank_yesterday.PID = Photo_Facemash.PID
        //                     ORDER BY view_rank_yesterday.score DESC LIMIT 10`,[yesterday, photosAmountYesterday]);
        sql = Mysql.format(`SELECT Photo_Facemash.PID, Photo_Facemash.name, Photo_Facemash.photo_url, view_rank_yesterday.score as score, Photo_Facemash.UID
                            FROM
                                (SELECT * FROM Ranking_Facemash WHERE DATE(date_time) = ? ORDER BY date_time DESC LIMIT ?) as view_rank_yesterday
                            INNER JOIN Photo_Facemash ON view_rank_yesterday.PID = Photo_Facemash.PID
                            ORDER BY view_rank_yesterday.score DESC LIMIT 10`,[yesterday, photosAmountYesterday]);
        // ส่งคำสั่ง query และกำหนด ชนิดข้อมูลที่ตอบกลับมา
        let ranking_photos_yesterday : PhotoRankingYesterdayModel[] = await queryAsync(sql) as PhotoRankingYesterdayModel[];

        // กำหนดรูปแบบ json ที่จะส่งกลับไป โดยส่ง ranking ของวันนี้ กับ ของเมื่อวาน
        let ranking_photos_todayAndYesterday = {
            ranking_photos_today : ranking_photos_today,
            yesterdayRank_of_photoRankToday : yesterday_rank_of_photos_today,
            ranking_photos_yesterday : ranking_photos_yesterday
        };
        // ส่งข้อมูล ranking photo ของวันนี้ และเมื่อวานกลับไป
        response.status(200).json(ranking_photos_todayAndYesterday);

    } catch (error) {
        response.status(200).json(error);
    }
});


//======================================================================= api แสดง graph ข้อมูลต่างๆ โดยใช้ PID รูปภาพนี้ --> http://127.0.0.1:3000/photo/thePhotoGraphs/6 (6 คือ pid ของรูปที่ต้องการ show ข้อมูล)
router.get('/thePhotoGraphs/:PID', async (request, response) => {
    try {
        // ดึงตัวแปล PID ออกมาจาก part get (+ คือทำให้เป็น int)
        let pid = + request.params.PID;
        // เรียกใช้ function ที่เรียก query อีกที่เพื่อดึงข้อมูลของรูปภาพด้วย PID
        let photo : PhotoModel = await selectPhotoByPID(pid);
        //========================================================== score ณ ปัจจุบันของรูปภาพนี้ และ rank ณ ปัจจุบันของรูปภาพนี้
        let score_rank = await getScoreAndRankOfPhotoByPID(pid);
        //========================================================== จำนวนครั้งทั้งหมดที่ รูปภาพนี้ เคยชนะ และเคยแพ้
        let wins_loses = await getWinsAndLosesOfPhotoByIPD(pid);

        //========================================================== วันที่.เดือน.ปี ของ 7 วันย้อนหลัง (เอาวันปัจจุบันด้วย (ก็คือวันนี้))
        let pastSevenDays = [];
        // ทำการย้อนหลังไป 7 วัน (เอาวันปัจจุบันด้วย (วันนี้))
        for (let i = 0; i < 7; i++) {
            let date = new Date(); // วันปัจจุบัน (วันนี้)
            date.setDate(date.getDate() - i); // หาวันที่ย้อนหลัง โดยการลบ 0, 1, 2, 3, 4, 5 และ 6 วัน
            // unshift คือ ข้อมูลที่เพิ่มเข้าไปใน array จะไปต่อด้านหน้าเรื่อยๆ
            // toISOString รูปแบบเวลาคือ "2024-03-23T15:41:56.366Z" แต่ไม่ต้องการ วินาที ดังนั้นทำการแบ่ง string ด้วยตัว T และเอาเฉพาะ yyyy-mm-dd [0]
            pastSevenDays.unshift(date.toISOString().split('T')[0]); // เพิ่มวันที่ในรูปแบบของวันที่.เดือน.ปี ไปยังอาร์เรย์
        }
        
        //========================================================== แสดง ranking_graph ของทั้ง 7 วันย้อนหลัง ว่าแต่ละวันนั้นรูปภาพนี้เคยอยู่ rank ไหนมาก่อนบ่าง
        let rank_past_7_days : number[] = await getRankingGraphForThePhoto(pid, pastSevenDays);

        //============================================================================= แสดง จำนวนที่รูปนี้ชนะ, จำนวนที่รูปนี้แพ้, จำนวนคะแนนที่ได้เมื่อชนะ, จำนวนคะแนนที่เสียเมื่อแพ้ ของ 7 วันย้อนหลัง ของรูปภาพนี้ด้วย PID
        // โดยส่ง PID ของรูปภาพ และ วันเวลา 7 วันย้อนหลังที่ต้องการค้นหาของรูปภาพนี้
        let winsAmount_losesAmount_winsScore_losesScore = await getWinsAmount_LosesAmount_WinsScore_LosesScore(pid, pastSevenDays);

        // กำหนดข้อมูลไว้แบบ json เพื่อทำการส่งกลับไป
        let jsonData = {
            PID: pid,
            name: photo.name,
            photo_url: photo.photo_url,
            score: score_rank.score,
            UID: photo.UID,
            rank: score_rank.rank,
            wins: wins_loses.wins,
            loses: wins_loses.loses,
            days: pastSevenDays,
            ranking_graph: rank_past_7_days,
            score_wins_graph: winsAmount_losesAmount_winsScore_losesScore.wins_score,
            score_loses_graph: winsAmount_losesAmount_winsScore_losesScore.loses_score,
            wins_amount_graph: winsAmount_losesAmount_winsScore_losesScore.wins_amount,
            loses_amount_graph: winsAmount_losesAmount_winsScore_losesScore.loses_amount
        };
        // ตอบกลับข้อมูลทั้งหมดที่จะไปแสดงในหน้า View the photo
        response.status(200).json( jsonData );
    } catch (error) {
        response.status(200).json(error);
    }
});

















///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Endpoint สำหรับอัพโหลดรูปภาพได้ไม่เกิน 5 รูป ของ User คนนั้นๆ
router.post("/", (req, res) => {
    let photo: PhotoModel = req.body;
    let sql = `SELECT Photo_Facemash.PID, Photo_Facemash.name, Photo_Facemash.photo_url, Photo_Facemash.score, Photo_Facemash.UID 
    FROM User_Facemash, Photo_Facemash WHERE User_Facemash.UID = Photo_Facemash.UID AND Photo_Facemash.UID = ?`;
    sql = Mysql.format(sql, [
        photo.UID,
    ]);
    connection.query(sql, (err, result) => {
        if (err) {
            res.status(400).json(err);
        } else {
            if (result.length < 5) {
                sql = `SELECT Photo_Facemash.PID, Photo_Facemash.name, Photo_Facemash.photo_url, Photo_Facemash.score, Photo_Facemash.UID 
                FROM User_Facemash, Photo_Facemash WHERE User_Facemash.UID = Photo_Facemash.UID AND Photo_Facemash.UID = ? AND Photo_Facemash.name = ?`;
                sql = Mysql.format(sql, [
                    photo.UID,
                    photo.name,
                ]);
                connection.query(sql, (err, result) => {
                    if (err) {
                        res.status(400).json(err);
                    } else {
                        if (result.length > 0) {
                            res.status(400).json({"result": "ชื่อนี้มีอยู่เเล้ว กรุณาใช้ชื่ออื่น"});
                        } else {
                            sql = "INSERT INTO `Photo_Facemash`(`name`, `photo_url`, `score`, `UID`) VALUES (?,?,?,?)";
                            sql = Mysql.format(sql, [
                                photo.name,
                                photo.photo_url,
                                photo.score,
                                photo.UID,
                            ]);
                            connection.query(sql, (err, result) => {
                                if (err) {
                                    res.status(400).json(err);
                                } else {
                                    res.status(201).json({ affected_row: result.affectedRows, last_idx: result.insertId });
                                }
                            });            
                        }
                    }
                });
            } else {
                res.status(205).json({"result": "สามารถอัพโหลดรูปภาพได้ไม่เกิน 5 รูปเท่านั้น"});
            }
        }
    });
});

// Endpoint สำหรับค้นหารูปภาพทั้งหมดของ User คนนั้นๆ
router.get("/user/:uid", (req, res) => {
    let uid = +req.params.uid;
    let sql = `SELECT Photo_Facemash.PID, Photo_Facemash.name, Photo_Facemash.photo_url, Photo_Facemash.score, Photo_Facemash.UID 
    FROM User_Facemash, Photo_Facemash WHERE User_Facemash.UID = Photo_Facemash.UID AND Photo_Facemash.UID = ?`;
    sql = Mysql.format(sql, [
        uid,
    ]);
    connection.query(sql, (err, result) => {
        if (err) {
            res.status(400).json(err);
        } else {
            res.status(200).json(result);
        }
    });
});

// Endpoint สำหรับค้นหารูปภาพด้วย PID
router.get("/:pid", (req, res) => {
    let pid = +req.params.pid;
    let sql = "select * from Photo_Facemash where PID = ?";
    sql = Mysql.format(sql, [
        pid,
    ]);
    connection.query(sql, (err, result) => {
        if (err) {
            res.status(400).json(err);
        } else {
            res.status(200).json(result);
        }
    });
});

// Endpoint สำหรับลบรูปภาพของ User คนนั้นๆจาก PID
// โดยเมื่อลบรูปภาพออกไปข้อมูลของรูปภาพนั้นๆที่อยู่ใน ตาราง Vote_Facemash เเละ Ranking_Facemash จะถูกลบหายไปด้วย
router.delete("/:pid", (req, res) => {

    // ทำการลบข้อมูลของรูปภาพนั้นๆ ที่อยู่ใน ตาราง Vote_Facemash ออกไป
    let pid = +req.params.pid;
    let sql = `DELETE Vote_Facemash FROM Vote_Facemash 
    JOIN Photo_Facemash ON Vote_Facemash.PID = Photo_Facemash.PID 
    WHERE Photo_Facemash.PID = ?`;
    sql = Mysql.format(sql, [
        pid,
    ]);
    connection.query(sql, (err, result) => {
        if (err) {
            res.status(400).json(err);
        } else {
            // เมื่อลบข้อมูลใน tabel Vote_Facemash เเล้วต่อไปทำการลบข้อมูลของรูปภาพนั้นๆใน tabel Ranking_Facemash
            sql = `DELETE FROM Ranking_Facemash WHERE PID = ?`;
            sql = Mysql.format(sql, [
                pid,
            ]);
            connection.query(sql, (err, result) => {
                if(err) {
                    res.status(400).json(err);
                } else {
                    // ทำการลบรูปภาพของ User คนนั้นๆจาก PID
                    sql = `DELETE FROM Photo_Facemash WHERE PID = ?`;
                    sql = Mysql.format(sql, [
                        pid,
                    ]);
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json(err);
                        } else {
                            res.status(200).json({ affected_row: result.affectedRows });
                        }
                    });
                }
            });
        }
    });
});

// Endpoint สำหรับเปลี่ยนรูปภาพได้ (ข้อมูลเดิมของรูปภาพจะหายไป และรูปภาพต้องถูกลบออกจากเครื่อง)
router.put("/:pid", async (req, res) => {
    let pid = +req.params.pid;
    let photo: PhotoModel = req.body;
    let photoOriginal: PhotoModel | undefined; //photoOriginal เพื่อเก็บข้อมูลของรูปภาพเดิม
    const queryAsync = util.promisify(connection.query).bind(connection);

    // ทำการค้นหาข้อมูลเดิมของ Photo เพื่อเก็บข้อมูลเดิมไว้ใช้ในการ Update กรณีที่ User ต้องการ Update เฉพาะข้อมูลบางคอลัมน์
    let sql = Mysql.format("select * from Photo_Facemash where PID = ?", [pid]);
    let result = await queryAsync(sql);
    const rawData = JSON.parse(JSON.stringify(result));
    // console.log(rawData);

    photoOriginal = rawData[0] as PhotoModel;
    // console.log(photoOriginal);

    let updatePhoto = {...photoOriginal, ...photo}; // นำข้อมูลที่ต้องการจะ Update ไปรวมกับข้อมูลเดิม
    //console.log(photo);
    //console.log(updatePhoto);

    // ถ้าผู้ใช้เปลี่ยนรูปภาพ (ข้อมูลเดิมของรูปภาพจะหายไป และรูปภาพต้องถูกลบออกจากเครื่อง)
    if (photo.photo_url) {
        // ทำการ Update ข้อมูลของรูปภาพ เเละกำหนดให้ score กับ rank เป็นค่าเริ่มต้น
        sql = "update `Photo_Facemash` set `name`=?, `photo_url`=?, `score`=0, `UID`=? where `PID`=?";
        sql = Mysql.format(sql, [
            updatePhoto.name,
            updatePhoto.photo_url,
            updatePhoto.UID,
            pid,
        ]);
        connection.query(sql, (err, result) => {
            if (err) {
                res.status(400).json(err);
            } else {

                // ทำการลบข้อมูลของรูปภาพเก่าใน ตาราง Vote_Facemash ทิ้งเนื่องจาก User ได้เปลี่ยนรูปภาพใหม่
                sql = `DELETE Vote_Facemash FROM Vote_Facemash 
                    JOIN Photo_Facemash ON Vote_Facemash.PID = Photo_Facemash.PID 
                    WHERE Photo_Facemash.PID = ?`;
                sql = Mysql.format(sql, [
                    pid,
                ]);
                connection.query(sql, (err, result) => {
                    if (err) {
                        res.status(400).json(err);
                    } else {
                        res.status(200).json({ affected_row: result.affectedRows });
                    }
                });
            }
        });
    } else {

        // เมื่อ User ไม่ได้เปลี่ยนรูปภาพ เเต่ทำการ Update ข้อมูลอื่นๆเช่น name จะไม่ทำการลบข้อมูลเดิมของรูปภาพเนื่องจากยังเป็นรูปภาพเดิม
        sql = "update `Photo_Facemash` set `name`=?, `photo_url`=?, `score`=?, `rank`=?, `UID`=? where `PID`=?";
        sql = Mysql.format(sql, [ // นำข้อมูลที่ต้องการจะ Update ที่รวมกับข้อมูลเดิมเเล้วไป Update ตาราง Photo_Facemash
            updatePhoto.name,
            updatePhoto.photo_url,
            updatePhoto.score,
            updatePhoto.rank,
            updatePhoto.UID,
            pid,
        ]);
        connection.query(sql, (err, result) => {
            if (err) throw err;
            res.status(201).json({ affected_row: result.affectedRows });
        });
    }
});







