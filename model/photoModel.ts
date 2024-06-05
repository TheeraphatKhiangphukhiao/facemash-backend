// To parse this data:
//
//   import { Convert, PhotoModel } from "./file";
//
//   const photoModel = Convert.toPhotoModel(json);


// export interface PhotoPostRequest {
//     PID:        number;
//     name:       string;
//     photo_url: string;
//     score:      number;
//     rank:       number;
//     UID:        number;
// } 


export interface PhotoModel {
    PID:       number;
    name:      string;
    photo_url: string;
    score:     number;
    rank:      number;
    UID:       number;
}



// Converts JSON strings to/from your types
export class Convert {
    public static toPhotoModel(json: string): PhotoModel {
        return JSON.parse(json);
    }

    public static photoModelToJson(value: PhotoModel): string {
        return JSON.stringify(value);
    }
}


