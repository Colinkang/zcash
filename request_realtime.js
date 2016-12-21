const request = require('request');
const url = 'http://zcash.flypool.org/api/miner_new/t1afdgdmPmjEJreiRhAKMm3uEUdS5tFuXM4';
const utils = require('./utils');
const xlsx = require('excel-export');
const fs = require('fs');

(async function(){
  let body = await new Promise(function(resolve,reject){
    request(url, function (error, response, body) {
        if (error || response.statusCode != 200) reject(error);
        else resolve(body);
      });
  });
 let payouts = JSON.parse(body).payouts;
 for(let i =0;i<payouts.length;i++){
  let query_payouts = utils.queryFormat('select * from payouts where payoutsid = ?',[payouts[i].id]);
  let result_payouts = await utils.P(utils.pool,'query',query_payouts);
  if(result_payouts.length == 0){
    let query = utils.queryFormat('insert into payouts set payoutsid = ?,amount = ?,miner = ?,start = ?,end = ?,txhash = ?,paidon = ?',[payouts[i].id,payouts[i].amount,payouts[i].miner,payouts[i].start,payouts[i].end,payouts[i].txHash,new Date(payouts[i].paidOn).getTime()]);

    await utils.P(utils.pool,'query',query);
  }




  const d = new Date();
  const time1 = new Date(d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' 00:00:00').getTime();//今天0点
  const time2 = time1-86400000;//昨天0点
  const time3 = time1-86400000*2;//前天0点
  let query = utils.queryFormat('select amount from payouts where paidon > ? and paidon <= ?',[time2,time1]);
  let result = await utils.P(utils.pool,'query',query);
  let amounts = 0;//一天中zcash每次的数量的累加值
   for(let i =0;i<result.length;i++){
     amounts += result[0].amount;
   }

   let amount =0;//每天zcash的累积值
   let query2 = utils.queryFormat('select amount from zcashincome where date = ?',[time3]);
   let result2 = await utils.P(utils.pool,'query',query2);
   if(result2.length !=0) amount = result2[0].amount;
   let date = time1;
   let payee = 'Zcash－flypool 矿池';
   let description = '挖币收入－矿厂';
   let income = amounts/100000000;
   let outpay = 0;
   amount +=income;
   let activeworker = 700;
   let avgHashrate = JSON.parse(body).avgHashrate;
   let in_hashrate_ratio = income/avgHashrate;
   let query3 = utils.queryFormat('insert into zcashincome set payee=?,date=?,description=?,income=?,outpay=?,amount=?,activeworker=?,hashrate=?,in_hashrate_ratio=?',[payee,date,description,income,outpay,amount,activeworker,avgHashrate,in_hashrate_ratio])
   let result3 = await utils.P(utils.pool,'query',query3);


   let query4 ='select * from zcashincome';
   let data = await utils.P(utils.pool,'query',query4);

   let conf = {};
   const filename ='Zcash Account';
   conf.cols =[
    {caption:'Date(日期)', type:'string', width:20},
    {caption:'Payee(收支对象)', type:'string', width:40},
    {caption:'Description(项目明细描述)', type:'string', width:20},
    {caption:'In', type:'number', width:40},
    {caption:'Out', type:'number', width:30},
    {caption:'amount(具体数目)', type:'number', width:30},
    {caption:'Active worker(有效矿工)', type:'number', width:30},
    {caption:'Hashrate(算力 KH/s)', type:'number', width:30},
    {caption:'ZEC／Hashrate(产出算力比)', type:'number', width:30}
  ];
  let array = [];
  conf.rows = [];
  for(let i=0;i<data.length;i++){
    array[i] = [
          new Date(data[i].date).getFullYear+'/'+ (new Date(data[i].date).getMonth()+1)+'/'+new Date(data[i].date).getDate(),
          data[i].payee,
          data[i].description,
          data[i].income,
          data[i].out,
          data[i].amount,
          data[i].activeworker,
          data[i].hashrate,
          data[i].in_hashrate_ratio
    ];
    conf.rows.push(array[i]);
  }


  var result_excel = xlsx.execute(conf);

    var random = Math.floor(Math.random()*10000+0);

    var uploadDir = 'excel/';
    var filePath = uploadDir + filename + random + ".xlsx";

    fs.writeFile(filePath, result_excel, 'binary',function(err){
        if(err){
            console.log(err);
        }
    });


 }
}());
