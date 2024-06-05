// To parse this data:
//
//   import { Convert, PhotoRankingYesterdayModel } from "./file";
//
//   const photoRankingYesterdayModel = Convert.toPhotoRankingYesterdayModel(json);

export interface PhotoRankingYesterdayModel {
    score_yesterday: number;
    date_time:       string;
    PID:             number;
    name:            string;
    photo_url:       string;
    UID:             number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toPhotoRankingYesterdayModel(json: string): PhotoRankingYesterdayModel {
        return JSON.parse(json);
    }

    public static photoRankingYesterdayModelToJson(value: PhotoRankingYesterdayModel): string {
        return JSON.stringify(value);
    }
}
