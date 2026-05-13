const fs=require("fs");
const csv=require("csv-parser");

const readCSV=()=>{
    return new Promise((resolve,reject)=>{
        const results=[];
        fs.createReadStream("invoices.csv").pipe(csv()).on("data",(data)=>{
            results.push(data);
        }).on("end",()=>{
            resolve(results);
        }).on("error",(err)=>{
            reject(err);
        });
    });
};

module.exports=readCSV;